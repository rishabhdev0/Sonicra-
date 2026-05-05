"use client";
import { useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { CreditCard, ExternalLink, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import { useCheckout } from "@/features/billing/hooks/use-checkout";
import { useTRPC } from "@/trpc/client";

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function PlanPreviewCard() {
  const { checkout, isPending } = useCheckout();
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <div className="size-8 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center shrink-0">
          <Sparkles className="size-4 text-slate-700" strokeWidth={1.8} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-[12.5px] font-bold text-slate-900">Workspace Plan</p>
            <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">
              Active
            </span>
          </div>
          <p className="mt-0.5 text-[10.5px] leading-snug text-slate-500">
            Sandbox access with usage billing preview.
          </p>
        </div>
      </div>
      <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
        <div className="flex items-center justify-between">
          <span className="text-[10.5px] font-medium text-slate-500">Live rate</span>
          <span className="text-[11px] font-bold text-slate-900">$0.30 / 1k chars</span>
        </div>
      </div>
      <Button
        className="h-8 w-full rounded-lg bg-slate-900 text-[11.5px] font-bold text-white hover:bg-slate-800"
        size="sm"
        disabled={isPending}
        onClick={checkout}
      >
        {isPending ? (
          <>
            <Spinner className="size-3" />
            Redirecting...
          </>
        ) : (
          <>
            Upgrade plan
            <ExternalLink className="size-3" />
          </>
        )}
      </Button>
    </div>
  );
}

function ActiveSubscriptionCard({
  estimatedCostCents,
}: {
  estimatedCostCents: number;
}) {
  const trpc = useTRPC();
  const portalMutation = useMutation(
    trpc.billing.createPortalSession.mutationOptions({}),
  );

  const openPortal = useCallback(() => {
    portalMutation.mutate(undefined, {
      onSuccess: (data) => {
        window.open(data.portalUrl, "_blank");
      },
    });
  }, [portalMutation]);

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <div className="size-8 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center shrink-0">
          <CreditCard className="size-4 text-slate-700" strokeWidth={1.8} />
        </div>
        <div className="min-w-0">
          <p className="text-[12.5px] font-bold text-slate-900">Current Usage</p>
          <p className="mt-0.5 text-[20px] font-extrabold leading-none text-slate-950">
            {formatCurrency(estimatedCostCents)}
          </p>
          <p className="mt-1 text-[10.5px] text-slate-500">
            Estimated this billing period
          </p>
        </div>
      </div>
      <Button
        variant="outline"
        className="h-8 w-full rounded-lg text-[11.5px] font-bold"
        size="sm"
        disabled={portalMutation.isPending}
        onClick={openPortal}
      >
        {portalMutation.isPending ? (
          <>
            <Spinner className="size-3" />
            Redirecting...
          </>
        ) : (
          <>
            Manage billing
            <ExternalLink className="size-3" />
          </>
        )}
      </Button>
    </div>
  );
}

// ✅ Loading skeleton — fixes the flicker on refresh
function UsageSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <Skeleton className="size-8 rounded-lg" />
        <div className="min-w-0 space-y-1.5 flex-1">
          <Skeleton className="h-3.5 w-24 rounded" />
          <Skeleton className="h-6 w-16 rounded" />
          <Skeleton className="h-3 w-32 rounded" />
        </div>
      </div>
      <Skeleton className="h-8 w-full rounded-lg" />
    </div>
  );
}

export function UsageContainer() {
  const trpc = useTRPC();
  const { data, isLoading } = useQuery(
    trpc.billing.getStatus.queryOptions({
      refetchInterval: 30000, // ✅ auto-refresh every 30s
    }),
  );

  return (
    <div className="group-data-[collapsible=icon]:hidden mx-1 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      {isLoading ? (
        <UsageSkeleton />
      ) : data?.hasActiveSubscription ? (
        <ActiveSubscriptionCard estimatedCostCents={data.estimatedCostCents} />
      ) : (
        <PlanPreviewCard />
      )}
    </div>
  );
}