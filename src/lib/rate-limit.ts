import "server-only";

import { prisma } from "@/lib/db";

export class RateLimitExceededError extends Error {
  constructor(public readonly retryAfterSeconds: number) {
    super("Rate limit exceeded");
    this.name = "RateLimitExceededError";
  }
}

export async function enforceRateLimit({
  scope,
  action,
  limit,
  windowMs,
}: {
  scope: string;
  action: string;
  limit: number;
  windowMs: number;
}) {
  const now = Date.now();
  const bucketStart = Math.floor(now / windowMs) * windowMs;
  const expiresAt = new Date(bucketStart + windowMs);
  const key = `${action}:${scope}:${bucketStart}`;

  const [bucket] = await prisma.$transaction([
    prisma.rateLimitBucket.upsert({
      where: { key },
      create: { key, count: 1, expiresAt },
      update: { count: { increment: 1 } },
      select: { count: true },
    }),
    prisma.rateLimitBucket.deleteMany({
      where: { expiresAt: { lt: new Date(now) }, key: { not: key } },
    }),
  ]);

  if (bucket.count > limit) {
    throw new RateLimitExceededError(
      Math.max(1, Math.ceil((expiresAt.getTime() - now) / 1_000)),
    );
  }
}
