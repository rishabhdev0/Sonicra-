"use client";

import { useCallback, useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Crown, CreditCard, ExternalLink, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCheckout } from "@/features/billing/hooks/use-checkout";
import { useTRPC } from "@/trpc/client";

const FREE_TIER_LIMIT = 10_000;

export function UsageContainer() {
  const trpc = useTRPC();
  const { checkout, isPending: checkoutPending } = useCheckout();
  const { data: billing, isLoading: billingLoading } = useQuery({
    ...trpc.billing.getStatus.queryOptions(),
    refetchInterval: 30_000,
  });
  const { data: generations = [], isLoading: generationsLoading } = useQuery(
    trpc.generations.getAll.queryOptions(),
  );
  const portalMutation = useMutation(trpc.billing.createPortalSession.mutationOptions({}));

  const charactersUsed = useMemo(
    () => generations.reduce((total, generation) => total + generation.text.length, 0),
    [generations],
  );
  const remaining = Math.max(0, FREE_TIER_LIMIT - charactersUsed);
  const usagePercent = Math.min(100, Math.round((charactersUsed / FREE_TIER_LIMIT) * 100));

  const openPortal = useCallback(() => {
    portalMutation.mutate(undefined, {
      onSuccess: ({ portalUrl }) => window.open(portalUrl, "_blank", "noopener,noreferrer"),
    });
  }, [portalMutation]);

  if (billingLoading || generationsLoading) {
    return (
      <div className="space-y-3 group-data-[collapsible=icon]:hidden">
        <Skeleton className="h-36 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-3 group-data-[collapsible=icon]:hidden">
      <div className="rounded-xl border border-sidebar-border bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.035)]">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-amber-50 text-amber-500">
            {billing?.hasActiveSubscription ? <CreditCard className="size-4" /> : <Crown className="size-4" />}
          </span>
          <p className="text-[13px] font-semibold text-primary">
            {billing?.hasActiveSubscription ? "Sonicra Pro" : "Upgrade to Pro"}
          </p>
        </div>
        <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
          {billing?.hasActiveSubscription
            ? "Manage your subscription and metered voice generation."
            : "Unlock continued generation and premium workspace features."}
        </p>
        <Button
          size="sm"
          className="mt-4 h-9 w-full rounded-lg text-[11px] font-semibold shadow-[0_8px_18px_rgba(109,93,252,0.2)]"
          disabled={checkoutPending || portalMutation.isPending}
          onClick={billing?.hasActiveSubscription ? openPortal : checkout}
        >
          {billing?.hasActiveSubscription ? "Manage plan" : "Upgrade now"}
          <ExternalLink className="size-3" />
        </Button>
      </div>

      {!billing?.hasActiveSubscription && (
        <div className="rounded-xl border border-sidebar-border bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.035)]">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium text-muted-foreground">Characters remaining</p>
            <Info className="size-3.5 text-muted-foreground" aria-label="Free tier allowance" />
          </div>
          <p className="mt-3 text-[18px] font-bold tabular-nums text-sidebar-foreground">
            {remaining.toLocaleString()}
            <span className="text-[11px] font-medium text-muted-foreground"> / {FREE_TIER_LIMIT.toLocaleString()}</span>
          </p>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${usagePercent}%` }} />
          </div>
          <p className="mt-3 text-[10px] text-muted-foreground">{usagePercent}% of the free allowance used</p>
        </div>
      )}
    </div>
  );
}
