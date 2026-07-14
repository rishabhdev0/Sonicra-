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
        <div className="size-8 rounded-md bg-sidebar-primary/14 flex items-center justify-center shrink-0">
          <Sparkles className="size-4 text-sidebar-primary" strokeWidth={1.8} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-[11.5px] font-semibold text-sidebar-foreground">Free workspace</p>
            <span className="rounded bg-white/7 px-1.5 py-0.5 text-[8px] font-bold uppercase text-sidebar-foreground/55">
              10k
            </span>
          </div>
          <p className="mt-0.5 text-[10px] leading-snug text-sidebar-foreground/45">
            Upgrade for continued usage.
          </p>
        </div>
      </div>
      <div className="rounded-md border border-white/7 bg-black/8 px-3 py-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-medium text-sidebar-foreground/45">Pro rate</span>
          <span className="text-[10.5px] font-semibold text-sidebar-foreground">$0.30 / 1k</span>
        </div>
      </div>
      <Button
        className="h-8 w-full rounded-md bg-sidebar-primary text-[11px] font-bold text-sidebar-primary-foreground hover:bg-sidebar-primary/90"
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
        <div className="size-8 rounded-md bg-sidebar-primary/14 flex items-center justify-center shrink-0">
          <CreditCard className="size-4 text-sidebar-primary" strokeWidth={1.8} />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-sidebar-foreground/55">Estimated usage</p>
          <p className="mt-1 text-[18px] font-bold leading-none text-sidebar-foreground">
            {formatCurrency(estimatedCostCents)}
          </p>
          <p className="mt-1 text-[10px] text-sidebar-foreground/45">
            Estimated this billing period
          </p>
        </div>
      </div>
      <Button
        variant="outline"
        className="h-8 w-full rounded-md border-white/10 bg-white/5 text-[11px] font-bold text-sidebar-foreground hover:bg-white/10 hover:text-white"
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
  const { data, isLoading } = useQuery({
    ...trpc.billing.getStatus.queryOptions(),
    refetchInterval: 30000,
  });

  return (
    <div className="group-data-[collapsible=icon]:hidden rounded-md border border-white/8 bg-white/4 p-3">
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
