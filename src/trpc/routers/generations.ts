import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
import { polar } from "@/lib/polar";
import { TRPCError } from "@trpc/server";
import { chatterbox } from "@/lib/chatterbox-client";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { deleteAudio, uploadAudio } from "@/lib/r2";
import { enforceRateLimit, RateLimitExceededError } from "@/lib/rate-limit";
import { Prisma } from "@/generated/prisma/client";
import { TEXT_MAX_LENGTH } from "@/features/text-to-speech/data/constants";
import { createTRPCRouter, orgProcedure } from "../init";

const FREE_TIER_LIMIT = 10000;

type GenerationReservation = {
  orgId: string;
  text: string;
  voiceId: string;
  voiceName: string;
  temperature: number;
  topP: number;
  topK: number;
  repetitionPenalty: number;
  enforceFreeTier: boolean;
};

async function reserveGeneration(input: GenerationReservation) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          if (input.enforceFreeTier) {
            const generations = await tx.generation.findMany({
              where: { orgId: input.orgId },
              select: { text: true },
            });
            const used = generations.reduce(
              (sum, generation) => sum + generation.text.length,
              0,
            );

            if (used + input.text.length > FREE_TIER_LIMIT) {
              throw new TRPCError({
                code: "FORBIDDEN",
                message: "SUBSCRIPTION_REQUIRED",
              });
            }
          }

          return tx.generation.create({
            data: {
              orgId: input.orgId,
              text: input.text,
              voiceName: input.voiceName,
              voiceId: input.voiceId,
              temperature: input.temperature,
              topP: input.topP,
              topK: input.topK,
              repetitionPenalty: input.repetitionPenalty,
            },
            select: { id: true },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      const shouldRetry =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034" &&
        attempt < 2;
      if (shouldRetry) continue;
      throw error;
    }
  }

  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "Unable to reserve generation capacity",
  });
}

async function generateAudio(
  text: string,
  voiceKey: string,
  temperature: number,
  topP: number,
  topK: number,
  repetitionPenalty: number,
): Promise<ArrayBuffer> {
  const isLongText = text.length > 400;

  if (isLongText) {
    // ✅ Use /generate-long for chunking + merging
    const response = await fetch(
      `${env.CHATTERBOX_API_URL}/generate-long`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": env.CHATTERBOX_API_KEY,
        },
        body: JSON.stringify({
          prompt: text,
          voice_key: voiceKey,
          temperature,
          top_p: topP,
          top_k: topK,
          repetition_penalty: repetitionPenalty,
          norm_loudness: true,
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Chatterbox error: ${errorText}`);
    }

    return await response.arrayBuffer();
  } else {
    // ✅ Use original /generate for short text
    const { data, error } = await chatterbox.POST("/generate", {
      body: {
        prompt: text,
        voice_key: voiceKey,
        temperature,
        top_p: topP,
        top_k: topK,
        repetition_penalty: repetitionPenalty,
        norm_loudness: true,
      },
      parseAs: "arrayBuffer",
    });

    if (error) throw new Error("Failed to generate audio");
    if (!(data instanceof ArrayBuffer)) throw new Error("Invalid audio response");

    return data;
  }
}

export const generationsRouter = createTRPCRouter({
  getById: orgProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const generation = await prisma.generation.findFirst({
        where: {
          id: input.id,
          orgId: ctx.orgId,
          r2ObjectKey: { not: null },
        },
        omit: {
          orgId: true,
          r2ObjectKey: true,
        },
      });

      if (!generation) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return {
        ...generation,
        audioUrl: `/api/audio/${generation.id}`,
      };
    }),

  getAll: orgProcedure.query(async ({ ctx }) => {
    const generations = await prisma.generation.findMany({
      where: { orgId: ctx.orgId, r2ObjectKey: { not: null } },
      orderBy: { createdAt: "desc" },
      omit: {
        orgId: true,
        r2ObjectKey: true,
      },
    });

    return generations;
  }),

  create: orgProcedure
    .input(
      z.object({
        text: z.string().trim().min(1).max(TEXT_MAX_LENGTH),
        voiceId: z.string().min(1),
        temperature: z.number().min(0).max(2).default(0.8),
        topP: z.number().min(0).max(1).default(0.95),
        topK: z.number().min(1).max(10000).default(1000),
        repetitionPenalty: z.number().min(1).max(2).default(1.2),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        await enforceRateLimit({
          scope: ctx.orgId,
          action: "voice-generation",
          limit: 10,
          windowMs: 60_000,
        });
      } catch (error) {
        if (error instanceof RateLimitExceededError) {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: `Too many generation requests. Retry in ${error.retryAfterSeconds} seconds.`,
          });
        }
        throw error;
      }

      const voice = await prisma.voice.findFirst({
        where: {
          id: input.voiceId,
          OR: [
            { variant: "SYSTEM" },
            { variant: "CUSTOM", orgId: ctx.orgId },
          ],
        },
        select: {
          id: true,
          name: true,
          r2ObjectKey: true,
        },
      });

      if (!voice) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Voice not found",
        });
      }

      if (!voice.r2ObjectKey) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Voice audio not available",
        });
      }

      let hasActiveSubscription = false;
      try {
        const customerState = await polar.customers.getStateExternal({
          externalId: ctx.orgId,
        });
        hasActiveSubscription =
          (customerState.activeSubscriptions ?? []).length > 0;
      } catch (error) {
        Sentry.captureException(error, {
          tags: { operation: "billing.subscriptionCheck" },
        });
      }

      const generation = await reserveGeneration({
        orgId: ctx.orgId,
        text: input.text,
        voiceId: voice.id,
        voiceName: voice.name,
        temperature: input.temperature,
        topP: input.topP,
        topK: input.topK,
        repetitionPenalty: input.repetitionPenalty,
        enforceFreeTier: !hasActiveSubscription,
      });
      const generationId = generation.id;
      const r2ObjectKey = `generations/orgs/${ctx.orgId}/${generationId}`;

      Sentry.logger.info("Generation started", {
        orgId: ctx.orgId,
        voiceId: input.voiceId,
        textLength: input.text.length,
        isLong: input.text.length > 400,
      });

      // ✅ Generate audio (short or long)
      let audioData: ArrayBuffer;
      try {
        audioData = await generateAudio(
          input.text,
          voice.r2ObjectKey,
          input.temperature,
          input.topP,
          input.topK,
          input.repetitionPenalty,
        );
      } catch {
        await prisma.generation
          .delete({ where: { id: generationId } })
          .catch(() => {});
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate audio",
        });
      }

      const buffer = Buffer.from(audioData);
      let uploaded = false;

      try {
        await uploadAudio({ buffer, key: r2ObjectKey });
        uploaded = true;

        await prisma.generation.update({
          where: { id: generationId },
          data: { r2ObjectKey },
        });

        Sentry.logger.info("Audio generated", {
          orgId: ctx.orgId,
          generationId: generation.id,
        });
      } catch {
        if (uploaded) await deleteAudio(r2ObjectKey).catch(() => {});
        await prisma.generation
          .delete({ where: { id: generationId } })
          .catch(() => {});

        Sentry.logger.error("Generation failed", {
          orgId: ctx.orgId,
          voiceId: input.voiceId,
        });

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to store generated audio",
        });
      }

      try {
        await polar.events.ingest({
          events: [
            {
              name: "tts_generation",
              externalCustomerId: ctx.orgId,
              metadata: { characters: input.text.length },
              timestamp: new Date(),
            },
          ],
        });
      } catch (error) {
        Sentry.captureException(error, {
          tags: { operation: "billing.ingestGenerationUsage" },
          extra: { generationId, characterCount: input.text.length },
        });
      }

      return { id: generationId };
    }),
});
