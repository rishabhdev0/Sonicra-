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
    attachRpcInput: false,
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

export const orgProcedure = baseProcedure.use(async ({ next }) => {
  const { userId, orgId, orgRole } = await auth();

  if (!userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  if (!orgId) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "An active organization is required",
    });
  }

  return next({ ctx: { userId, orgId, orgRole } });
});

export const orgAdminProcedure = orgProcedure.use(async ({ ctx, next }) => {
  if (ctx.orgRole !== "org:admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Organization admin access is required",
    });
  }

  return next({ ctx });
});
