import { TRPCError } from "@trpc/server";
import * as Sentry from "@sentry/nextjs";
import { polar } from "@/lib/polar";
import { env } from "@/lib/env";
import { createTRPCRouter, orgAdminProcedure, orgProcedure } from "../init";

function billingUrl(path: string) {
  return new URL(path, env.APP_URL).toString();
}

export const billingRouter = createTRPCRouter({
  createCheckout: orgAdminProcedure.mutation(async ({ ctx }) => {
    try {
      const result = await polar.checkouts.create({
        products: [env.POLAR_PRODUCT_ID],
        externalCustomerId: ctx.orgId,
        successUrl: billingUrl("/?view=billing&checkout=success"),
        returnUrl: billingUrl("/?view=billing"),
      });

      if (!result.url) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create checkout session",
        });
      }

      return { checkoutUrl: result.url };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      Sentry.captureException(error, {
        tags: { operation: "billing.createCheckout" },
      });
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Unable to start checkout. Please try again.",
      });
    }
  }),

  createPortalSession: orgAdminProcedure.mutation(async ({ ctx }) => {
    try {
      const result = await polar.customerSessions.create({
        externalCustomerId: ctx.orgId,
        returnUrl: billingUrl("/?view=billing"),
      });

      if (!result.customerPortalUrl) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create customer portal session",
        });
      }

      return { portalUrl: result.customerPortalUrl };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      Sentry.captureException(error, {
        tags: { operation: "billing.createPortalSession" },
      });
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Unable to open billing. Please try again.",
      });
    }
  }),

  getStatus: orgProcedure.query(async ({ ctx }) => {
    try {
      const customerState = await polar.customers.getStateExternal({
        externalId: ctx.orgId,
      });

      const hasActiveSubscription =
        (customerState.activeSubscriptions ?? []).length > 0;

      let estimatedCostCents = 0;
      for (const sub of customerState.activeSubscriptions ?? []) {
        for (const meter of sub.meters ?? []) {
          estimatedCostCents += meter.amount ?? 0;
        }
      }

      return {
        hasActiveSubscription,
        customerId: customerState.id,
        estimatedCostCents,
      };
    } catch {
      return {
        hasActiveSubscription: false,
        customerId: null,
        estimatedCostCents: 0,
      };
    }
  }),
});
