import { TRPCError } from "@trpc/server";
import { polar } from "@/lib/polar";
import { env } from "@/lib/env";
import { createTRPCRouter, orgProcedure } from "../init";

export const billingRouter = createTRPCRouter({
  createCheckout: orgProcedure.mutation(async ({ ctx }) => {
    console.log("ORG ID:", ctx.orgId);
    console.log("POLAR_PRODUCT_ID:", env.POLAR_PRODUCT_ID);
    console.log("APP_URL:", process.env.APP_URL);

    try {
      const result = await polar.checkouts.create({
        products: [env.POLAR_PRODUCT_ID],
        externalCustomerId: ctx.orgId,
        successUrl: `${process.env.APP_URL}/dashboard?success=true`,
      });

      if (!result.url) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create checkout session",
        });
      }

      return { checkoutUrl: result.url };
    } catch (e) {
      console.error("POLAR ERROR:", JSON.stringify(e, null, 2));
      throw e;
    }
  }),

  createPortalSession: orgProcedure.mutation(async ({ ctx }) => {
    const result = await polar.customerSessions.create({
      externalCustomerId: ctx.orgId,
    });

    if (!result.customerPortalUrl) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create customer portal session",
      });
    }

    return { portalUrl: result.customerPortalUrl };
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