import * as Sentry from "@sentry/node";
import { auth } from '@clerk/nextjs/server';
import { initTRPC, TRPCError } from '@trpc/server';
import { cache } from 'react';
import superjson from "superjson";

export const createTRPCContext = cache(async () => {
  return {};
});

const t = initTRPC.create({
  transformer: superjson,
});

const sentryMiddleware = t.middleware(
  Sentry.trpcMiddleware({
    attachRpcInput: true,
  }),
);

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
export const baseProcedure = t.procedure.use(sentryMiddleware);

export const authProcedure = baseProcedure.use(async ({ next }) => {
  const { userId } = await auth();

  if (!userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return next({
    ctx: { userId },
  });
});

// ✅ FIXED: falls back to userId if no orgId
export const orgProcedure = baseProcedure.use(async ({ next }) => {
  const { userId, orgId } = await auth();

  if (!userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  // Use orgId if available, otherwise fall back to userId
  const scopeId = orgId ?? userId;

  return next({ ctx: { userId, orgId: scopeId } });
});