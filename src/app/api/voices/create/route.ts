import { auth } from "@clerk/nextjs/server";
import * as Sentry from "@sentry/nextjs";
import { parseBuffer } from "music-metadata";
import { z } from "zod";
import { polar } from "@/lib/polar";
import { prisma } from "@/lib/db";
import { uploadAudio } from "@/lib/r2";
import { enforceRateLimit, RateLimitExceededError } from "@/lib/rate-limit";
import { VOICE_CATEGORIES } from "@/features/voices/data/voice-categories";
import type { VoiceCategory } from "@/generated/prisma/client";

const createVoiceSchema = z.object({
  name: z.string().trim().min(1, "Voice name is required").max(80),
  category: z.enum(VOICE_CATEGORIES as [VoiceCategory, ...VoiceCategory[]]),
  language: z.string().trim().min(2, "Language is required").max(35),
  description: z.string().trim().max(500).nullish(),
});

const MAX_UPLOAD_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB
const MIN_AUDIO_DURATION_SECONDS = 10;

export async function POST(request: Request) {
  const { userId, orgId } = await auth();

  if (!userId || !orgId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await enforceRateLimit({
      scope: orgId,
      action: "voice-clone",
      limit: 5,
      windowMs: 60 * 60 * 1_000,
    });
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return Response.json(
        { error: "Too many voice creation requests" },
        {
          status: 429,
          headers: { "Retry-After": String(error.retryAfterSeconds) },
        },
      );
    }
    throw error;
  }

    // Check for active subscription before voice creation
  try {
    const customerState = await polar.customers.getStateExternal({
      externalId: orgId,
    });
    const hasActiveSubscription =
      (customerState.activeSubscriptions ?? []).length > 0;
    if (!hasActiveSubscription) {
      return Response.json({ error: "SUBSCRIPTION_REQUIRED" }, { status: 403 });
    }
  } catch {
    // Customer doesn't exist in Polar yet -> no subscription
    return Response.json({ error: "SUBSCRIPTION_REQUIRED" }, { status: 403 });
  }

  const url = new URL(request.url);

  const validation = createVoiceSchema.safeParse({
    name: url.searchParams.get("name"),
    category: url.searchParams.get("category"),
    language: url.searchParams.get("language"),
    description: url.searchParams.get("description"),
  });

  if (!validation.success) {
    return Response.json(
      {
        error: "Invalid input",
        issues: validation.error.issues,
      },
      { status: 400 },
    );
  }

  const { name, category, language, description } = validation.data;

  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_UPLOAD_SIZE_BYTES) {
    return Response.json(
      { error: "Audio file exceeds the 20 MB size limit" },
      { status: 413 },
    );
  }

  const fileBuffer = await request.arrayBuffer();

  if (!fileBuffer.byteLength) {
    return Response.json(
      { error: "Please upload an audio file" },
      { status: 400 },
    );
  }

  if (fileBuffer.byteLength > MAX_UPLOAD_SIZE_BYTES) {
    return Response.json(
      { error: "Audio file exceeds the 20 MB size limit" },
      { status: 413 },
    );
  }

  const contentType = request.headers.get("content-type");

  if (!contentType) {
    return Response.json(
      { error: "Missing Content-Type header" },
      { status: 400 },
    );
  }

  const normalizedContentType =
    contentType.split(";")[0]?.trim() || "audio/wav";

  if (!normalizedContentType.startsWith("audio/")) {
    return Response.json(
      { error: "Content-Type must describe an audio file" },
      { status: 415 },
    );
  }

  // Validate audio format and duration
  let duration: number;
  try {
    const metadata = await parseBuffer(
      new Uint8Array(fileBuffer),
      { mimeType: normalizedContentType },
      { duration: true },
    );
    duration = metadata.format.duration ?? 0;
  } catch {
    return Response.json(
      { error: "File is not a valid audio file" },
      { status: 422 },
    );
  }

  if (duration < MIN_AUDIO_DURATION_SECONDS) {
    return Response.json(
      {
        error: `Audio too short (${duration.toFixed(1)}s). Minimum duration is ${MIN_AUDIO_DURATION_SECONDS} seconds.`,
      },
      { status: 422 },
    );
  }

  let createdVoiceId: string | null = null;

  try {
    const voice = await prisma.voice.create({
      data: {
        name,
        variant: "CUSTOM",
        orgId,
        description,
        category,
        language,
      },
      select: {
        id: true,
      },
    });

    createdVoiceId = voice.id;
    const r2ObjectKey = `voices/orgs/${orgId}/${voice.id}`;

    await uploadAudio({
      buffer: Buffer.from(fileBuffer),
      key: r2ObjectKey,
      contentType: normalizedContentType,
    });

    await prisma.voice.update({
      where: {
        id: voice.id,
      },
      data: {
        r2ObjectKey,
      },
    });
  } catch {
    if (createdVoiceId) {
      await prisma.voice
        .delete({
          where: {
            id: createdVoiceId,
          },
        })
        .catch(() => {});
    }

    return Response.json(
      { error: "Failed to create voice. Please retry." },
      { status: 500 },
    );
  }

  try {
    await polar.events.ingest({
      events: [
        {
          name: "voice_creation",
          externalCustomerId: orgId,
          metadata: {},
          timestamp: new Date(),
        },
      ],
    });
  } catch (error) {
    Sentry.captureException(error, {
      tags: { operation: "billing.ingestVoiceCreation" },
      extra: { voiceId: createdVoiceId },
    });
  }

  return Response.json(
    { name, message: "Voice created successfully" },
    { status: 201 },
  );
};
