import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
import { polar } from "@/lib/polar";
import { TRPCError } from "@trpc/server";
import { chatterbox } from "@/lib/chatterbox-client";
import { prisma } from "@/lib/db";
import { uploadAudio } from "@/lib/r2";
import { TEXT_MAX_LENGTH } from "@/features/text-to-speech/data/constants";
import { createTRPCRouter, orgProcedure } from "../init";

const FREE_TIER_LIMIT = 10000;

async function getOrgCharacterUsage(orgId: string): Promise<number> {
  const allGenerations = await prisma.generation.findMany({
    where: { orgId },
    select: { text: true },
  });
  return allGenerations.reduce((sum, g) => sum + g.text.length, 0);
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
      `${process.env.CHATTERBOX_API_URL}/generate-long`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.CHATTERBOX_API_KEY!,
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
      const generation = await prisma.generation.findUnique({
        where: { id: input.id, orgId: ctx.orgId },
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
      where: { orgId: ctx.orgId },
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
        text: z.string().min(1).max(TEXT_MAX_LENGTH),
        voiceId: z.string().min(1),
        temperature: z.number().min(0).max(2).default(0.8),
        topP: z.number().min(0).max(1).default(0.95),
        topK: z.number().min(1).max(10000).default(1000),
        repetitionPenalty: z.number().min(1).max(2).default(1.2),
      })
    )
    .mutation(async ({ input, ctx }) => {

      // ── Subscription + Free Tier Check ──────────────────────────────
      try {
        const customerState = await polar.customers.getStateExternal({
          externalId: ctx.orgId,
        });
        const hasActiveSubscription =
          (customerState.activeSubscriptions ?? []).length > 0;

        if (!hasActiveSubscription) {
          const totalUsed = await getOrgCharacterUsage(ctx.orgId);
          if (totalUsed + input.text.length > FREE_TIER_LIMIT) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "SUBSCRIPTION_REQUIRED",
            });
          }
        }
      } catch (err) {
        if (err instanceof TRPCError) throw err;
        const totalUsed = await getOrgCharacterUsage(ctx.orgId);
        if (totalUsed + input.text.length > FREE_TIER_LIMIT) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "SUBSCRIPTION_REQUIRED",
          });
        }
      }
      // ────────────────────────────────────────────────────────────────

      const voice = await prisma.voice.findUnique({
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
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate audio",
        });
      }

      const buffer = Buffer.from(audioData);
      let generationId: string | null = null;
      let r2ObjectKey: string | null = null;

      try {
        const generation = await prisma.generation.create({
          data: {
            orgId: ctx.orgId,
            text: input.text,
            voiceName: voice.name,
            voiceId: voice.id,
            temperature: input.temperature,
            topP: input.topP,
            topK: input.topK,
            repetitionPenalty: input.repetitionPenalty,
          },
          select: {
            id: true,
          },
        });

        generationId = generation.id;
        r2ObjectKey = `generations/orgs/${ctx.orgId}/${generation.id}`;

        await uploadAudio({ buffer, key: r2ObjectKey });

        await prisma.generation.update({
          where: { id: generation.id },
          data: { r2ObjectKey },
        });

        Sentry.logger.info("Audio generated", {
          orgId: ctx.orgId,
          generationId: generation.id,
        });
      } catch {
        if (generationId) {
          await prisma.generation
            .delete({ where: { id: generationId } })
            .catch(() => {});
        }

        Sentry.logger.error("Generation failed", {
          orgId: ctx.orgId,
          voiceId: input.voiceId,
        });

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to store generated audio",
        });
      }

      if (!generationId || !r2ObjectKey) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to store generated audio",
        });
      }

      polar.events
        .ingest({
          events: [
            {
              name: "tts_generation",
              externalCustomerId: ctx.orgId,
              metadata: { characters: input.text.length },
              timestamp: new Date(),
            },
          ],
        })
        .then(() => {
          console.log("✅ Polar event ingested! orgId:", ctx.orgId, "chars:", input.text.length);
        })
        .catch((err) => {
          console.error("❌ Polar event FAILED:", JSON.stringify(err, null, 2));
        });

      return { id: generationId };
    }),
});