"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AudioLines,
  Bell,
  Check,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  CreditCard,
  Library,
  Mic2,
  Pause,
  Play,
  Sparkles,
  TrendingDown,
  TrendingUp,
  WandSparkles,
  X,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { VoiceCreateDialog } from "@/features/voices/components/voice-create-dialog";
import { COST_PER_UNIT } from "@/features/text-to-speech/data/constants";
import { useCheckout } from "@/features/billing/hooks/use-checkout";
import { useTRPC } from "@/trpc/client";
import { cn } from "@/lib/utils";

type Period = "7d" | "14d" | "30d";

const FREE_TIER_LIMIT = 10_000;
const periodDays: Record<Period, number> = { "7d": 7, "14d": 14, "30d": 30 };

function formatCompact(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: value >= 1000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);
}

function timeAgo(date: Date) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function getDelta(current: number, previous: number) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function MetricDelta({ value, label }: { value?: number; label: string }) {
  if (value === undefined) {
    return <p className="mt-2 text-[11px] text-muted-foreground">{label}</p>;
  }

  const positive = value > 0;
  const negative = value < 0;

  return (
    <div className="mt-2 flex items-center gap-1.5 text-[11px]">
      {positive && <TrendingUp className="size-3 text-emerald-600" />}
      {negative && <TrendingDown className="size-3 text-rose-600" />}
      <span className={cn("font-semibold", positive && "text-emerald-700", negative && "text-rose-700", !positive && !negative && "text-muted-foreground")}>
        {positive ? "+" : ""}{value}%
      </span>
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}

const tooltipStyle = {
  borderRadius: 8,
  border: "1px solid #dfe3dc",
  background: "#ffffff",
  boxShadow: "0 12px 28px rgba(22, 31, 29, 0.12)",
  color: "#1d2926",
  fontSize: 12,
};

export function DashboardView() {
  const trpc = useTRPC();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useUser();
  const { checkout, isPending: checkoutPending } = useCheckout();
  const [period, setPeriod] = useState<Period>("7d");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [voiceDialogOpen, setVoiceDialogOpen] = useState(false);
  const [lastReadCount, setLastReadCount] = useState(0);

  const { data: generations = [] } = useQuery(trpc.generations.getAll.queryOptions());
  const { data: voices } = useQuery(trpc.voices.getAll.queryOptions());
  const { data: billing } = useQuery(trpc.billing.getStatus.queryOptions());
  const portalMutation = useMutation(trpc.billing.createPortalSession.mutationOptions({}));

  const billingView = searchParams.get("view") === "billing";
  const totalCharacters = useMemo(
    () => generations.reduce((total, generation) => total + generation.text.length, 0),
    [generations],
  );
  const customVoiceCount = voices?.custom.length ?? 0;
  const systemVoiceCount = voices?.system.length ?? 0;
  const totalVoiceCount = customVoiceCount + systemVoiceCount;
  const averageLength = generations.length ? Math.round(totalCharacters / generations.length) : 0;

  useEffect(() => {
    setLastReadCount(Number(localStorage.getItem("sonicra_notif_read") ?? 0));
  }, []);

  const comparison = useMemo(() => {
    const now = new Date();
    const currentStart = new Date(now);
    currentStart.setHours(0, 0, 0, 0);
    currentStart.setDate(currentStart.getDate() - 6);
    const previousStart = new Date(currentStart);
    previousStart.setDate(previousStart.getDate() - 7);

    const current = generations.filter((generation) => new Date(generation.createdAt) >= currentStart);
    const previous = generations.filter((generation) => {
      const date = new Date(generation.createdAt);
      return date >= previousStart && date < currentStart;
    });

    const currentCharacters = current.reduce((total, generation) => total + generation.text.length, 0);
    const previousCharacters = previous.reduce((total, generation) => total + generation.text.length, 0);

    return {
      generationDelta: getDelta(current.length, previous.length),
      characterDelta: getDelta(currentCharacters, previousCharacters),
    };
  }, [generations]);

  const chartData = useMemo(() => {
    const days = periodDays[period];
    return Array.from({ length: days }, (_, index) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (days - 1 - index));
      const dailyGenerations = generations.filter(
        (generation) => new Date(generation.createdAt).toDateString() === date.toDateString(),
      );

      return {
        label: date.toLocaleDateString("en-US", days > 14 ? { month: "short", day: "numeric" } : { weekday: "short" }),
        generations: dailyGenerations.length,
        characters: dailyGenerations.reduce((total, generation) => total + generation.text.length, 0),
      };
    });
  }, [generations, period]);

  const voiceUsage = useMemo(() => {
    const counts = new Map<string, number>();
    generations.forEach((generation) => {
      counts.set(generation.voiceName, (counts.get(generation.voiceName) ?? 0) + 1);
    });
    const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    const maximum = ranked[0]?.[1] ?? 1;
    return ranked.map(([name, count]) => ({ name, count, width: Math.round((count / maximum) * 100) }));
  }, [generations]);

  const recentNotifications = generations.slice(0, 5);
  const unreadCount = Math.max(0, recentNotifications.length - lastReadCount);
  const chartHasData = chartData.some((item) => item.generations > 0);
  const usagePercent = Math.min(100, Math.round((totalCharacters / FREE_TIER_LIMIT) * 100));
  const estimatedUsageCost = billing?.hasActiveSubscription
    ? (billing.estimatedCostCents ?? 0) / 100
    : totalCharacters * COST_PER_UNIT;

  function toggleNotifications() {
    setNotificationsOpen((open) => !open);
    if (!notificationsOpen) {
      setLastReadCount(recentNotifications.length);
      localStorage.setItem("sonicra_notif_read", String(recentNotifications.length));
    }
  }

  function openPortal() {
    portalMutation.mutate(undefined, {
      onSuccess: ({ portalUrl }) => window.open(portalUrl, "_blank", "noopener,noreferrer"),
    });
  }

  return (
    <div className="min-h-full">
      <VoiceCreateDialog open={voiceDialogOpen} onOpenChange={setVoiceDialogOpen} />
      <PageHeader
        title={billingView ? "Billing & usage" : "Studio overview"}
        description={billingView ? "Plan controls and metered character usage" : "Performance, activity, and voice operations"}
      />

      <div className="mx-auto w-full max-w-[1480px] px-4 py-5 lg:px-7 lg:py-7">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="inline-flex h-8 items-center rounded-md border bg-card p-0.5 shadow-sm">
            <button
              type="button"
              onClick={() => router.replace("/")}
              className={cn("h-7 rounded px-3 text-xs font-semibold transition-colors", !billingView ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}
            >
              Overview
            </button>
            <button
              type="button"
              onClick={() => router.replace("/?view=billing")}
              className={cn("h-7 rounded px-3 text-xs font-semibold transition-colors", billingView ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}
            >
              Billing
            </button>
          </div>

          <div className="relative">
            <Button variant="outline" size="icon-sm" onClick={toggleNotifications} className="relative bg-card" aria-label="Open notifications">
              <Bell className="size-4" />
              {unreadCount > 0 && <span className="absolute -right-1 -top-1 size-2.5 rounded-full border-2 border-background bg-[#ef765f]" />}
            </Button>
            {notificationsOpen && (
              <div className="absolute right-0 top-10 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-lg border bg-popover shadow-xl">
                <div className="flex items-center justify-between border-b px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold">Recent activity</p>
                    <p className="text-[11px] text-muted-foreground">Latest audio generations</p>
                  </div>
                  <button type="button" onClick={() => setNotificationsOpen(false)} className="text-muted-foreground hover:text-foreground" aria-label="Close notifications">
                    <X className="size-4" />
                  </button>
                </div>
                <div className="max-h-72 divide-y overflow-y-auto">
                  {recentNotifications.length ? recentNotifications.map((generation) => (
                    <Link key={generation.id} href={`/text-to-speech/${generation.id}`} onClick={() => setNotificationsOpen(false)} className="flex gap-3 px-4 py-3 transition-colors hover:bg-muted/60">
                      <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
                        <AudioLines className="size-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold">{generation.voiceName}</p>
                        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{generation.text}</p>
                        <p className="mt-1 text-[10px] text-muted-foreground">{timeAgo(generation.createdAt)}</p>
                      </div>
                    </Link>
                  )) : <p className="px-4 py-8 text-center text-xs text-muted-foreground">No activity yet</p>}
                </div>
              </div>
            )}
          </div>
        </div>

        {billingView ? (
          <div className="space-y-5">
            <section className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
              <div className="overflow-hidden rounded-lg border bg-card">
                <div className="flex flex-col justify-between gap-6 p-5 sm:flex-row sm:items-center lg:p-6">
                  <div>
                    <div className="mb-3 flex items-center gap-2">
                      <span className="rounded bg-accent px-2 py-1 text-[10px] font-bold uppercase text-accent-foreground">
                        {billing?.hasActiveSubscription ? "Active" : "Free tier"}
                      </span>
                      <span className="text-xs text-muted-foreground">Workspace plan</span>
                    </div>
                    <h2 className="text-2xl font-semibold">{billing?.hasActiveSubscription ? "Sonicra Pro" : "Sonicra Free"}</h2>
                    <p className="mt-1 max-w-lg text-sm text-muted-foreground">
                      {billing?.hasActiveSubscription ? "Metered voice generation with premium voices and custom cloning." : "10,000 characters included before a subscription is required."}
                    </p>
                  </div>
                  {billing?.hasActiveSubscription ? (
                    <Button onClick={openPortal} disabled={portalMutation.isPending} className="shrink-0">
                      <CreditCard className="size-4" />
                      Manage plan
                    </Button>
                  ) : (
                    <Button onClick={checkout} disabled={checkoutPending} className="shrink-0">
                      <Sparkles className="size-4" />
                      Upgrade to Pro
                    </Button>
                  )}
                </div>
                <div className="grid border-t sm:grid-cols-3 sm:divide-x">
                  {[
                    { label: "Characters generated", value: totalCharacters.toLocaleString() },
                    { label: "Estimated usage", value: `$${estimatedUsageCost.toFixed(2)}` },
                    { label: "Generation rate", value: "$0.30 / 1k" },
                  ].map((item) => (
                    <div key={item.label} className="px-5 py-4">
                      <p className="text-[11px] text-muted-foreground">{item.label}</p>
                      <p className="mt-1 text-lg font-semibold tabular-nums">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border bg-foreground p-5 text-background lg:p-6">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-background/65">Current allowance</p>
                  <CircleDollarSign className="size-4 text-primary" />
                </div>
                <p className="mt-5 text-3xl font-semibold tabular-nums">{formatCompact(totalCharacters)}</p>
                <p className="mt-1 text-xs text-background/55">of {FREE_TIER_LIMIT.toLocaleString()} free characters</p>
                <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-background/15">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${usagePercent}%` }} />
                </div>
                <p className="mt-2 text-[11px] text-background/55">{Math.max(0, FREE_TIER_LIMIT - totalCharacters).toLocaleString()} characters remaining</p>
              </div>
            </section>

            <section className="rounded-lg border bg-card">
              <div className="border-b px-5 py-4">
                <h3 className="text-sm font-semibold">What your workspace includes</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">Production capabilities already connected to this organization.</p>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4">
                {[
                  "20 built-in voices",
                  "Custom voice cloning",
                  "5,000 characters per generation",
                  "Full generation history",
                ].map((feature) => (
                  <div key={feature} className="flex items-center gap-2.5 border-b px-5 py-4 last:border-b-0 sm:border-r lg:border-b-0">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground"><Check className="size-3" /></span>
                    <span className="text-xs font-medium">{feature}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        ) : (
          <div className="space-y-5">
            <section className="studio-grid relative overflow-hidden rounded-lg border bg-card p-5 lg:p-6">
              <div className="absolute inset-y-0 right-0 hidden w-[38%] bg-[linear-gradient(90deg,transparent,var(--card))] lg:block" />
              <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
                <div>
                  <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-primary">
                    <span className="size-1.5 rounded-full bg-primary" />
                    Voice workspace ready
                  </div>
                  <h2 className="max-w-xl text-2xl font-semibold leading-tight lg:text-[28px]">
                    {user?.firstName ? `Good to see you, ${user.firstName}.` : "Your audio studio is ready."}
                  </h2>
                  <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                    Turn a script into polished speech, reuse a proven voice, or clone a new one for this workspace.
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button variant="outline" onClick={() => setVoiceDialogOpen(true)} className="bg-card">
                    <Mic2 className="size-4" />
                    Clone voice
                  </Button>
                  <Button asChild>
                    <Link href="/text-to-speech">
                      <AudioLines className="size-4" />
                      Create audio
                    </Link>
                  </Button>
                </div>
              </div>
            </section>

            <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[
                { label: "Total generations", value: formatCompact(generations.length), icon: AudioLines, delta: comparison.generationDelta, note: "vs previous 7 days" },
                { label: "Characters used", value: formatCompact(totalCharacters), icon: Clock3, delta: comparison.characterDelta, note: "vs previous 7 days" },
                { label: "Average script", value: formatCompact(averageLength), icon: WandSparkles, note: "characters per generation" },
                { label: "Voice library", value: formatCompact(totalVoiceCount), icon: Library, note: `${customVoiceCount} custom, ${systemVoiceCount} built-in` },
              ].map((metric) => (
                <div key={metric.label} className="rounded-lg border bg-card p-4 lg:p-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[11px] font-medium text-muted-foreground">{metric.label}</p>
                    <metric.icon className="size-4 text-muted-foreground/70" strokeWidth={1.7} />
                  </div>
                  <p className="mt-3 text-2xl font-semibold tabular-nums lg:text-[28px]">{metric.value}</p>
                  <MetricDelta value={metric.delta} label={metric.note} />
                </div>
              ))}
            </section>

            <section className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(280px,0.65fr)]">
              <div className="rounded-lg border bg-card">
                <div className="flex flex-col gap-3 border-b px-4 py-4 sm:flex-row sm:items-center sm:justify-between lg:px-5">
                  <div>
                    <h3 className="text-sm font-semibold">Generation activity</h3>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">Completed audio jobs over time</p>
                  </div>
                  <div className="inline-flex w-fit rounded-md bg-muted p-0.5">
                    {(["7d", "14d", "30d"] as Period[]).map((item) => (
                      <button key={item} type="button" onClick={() => setPeriod(item)} className={cn("h-7 rounded px-2.5 text-[11px] font-semibold", period === item ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")}>
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="h-[280px] px-2 pb-3 pt-5 sm:px-4">
                  {chartHasData ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
                        <CartesianGrid vertical={false} stroke="#e7e9e4" strokeDasharray="3 5" />
                        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#7a827e", fontSize: 11 }} interval={period === "30d" ? 5 : 0} />
                        <YAxis axisLine={false} tickLine={false} allowDecimals={false} tick={{ fill: "#7a827e", fontSize: 11 }} />
                        <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: "#9aa29d", strokeDasharray: "3 4" }} />
                        <Line type="monotone" dataKey="generations" name="Generations" stroke="#0f766e" strokeWidth={2.25} dot={false} activeDot={{ r: 4, fill: "#0f766e", stroke: "#ffffff", strokeWidth: 2 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center">
                      <div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-muted"><AudioLines className="size-4 text-muted-foreground" /></div>
                      <p className="text-sm font-semibold">No activity in this range</p>
                      <Link href="/text-to-speech" className="mt-1 text-xs font-medium text-primary hover:underline">Create the first generation</Link>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-lg border bg-card p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">Character allowance</h3>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">Free-tier usage</p>
                  </div>
                  <CircleDollarSign className="size-4 text-primary" />
                </div>
                <div className="mt-8 flex items-end justify-between gap-3">
                  <p className="text-3xl font-semibold tabular-nums">{formatCompact(totalCharacters)}</p>
                  <p className="pb-1 text-xs text-muted-foreground">of {formatCompact(FREE_TIER_LIMIT)}</p>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${usagePercent}%` }} />
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>{usagePercent}% used</span>
                  <span>{Math.max(0, FREE_TIER_LIMIT - totalCharacters).toLocaleString()} left</span>
                </div>
                <div className="mt-7 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Estimated value</span>
                    <span className="text-sm font-semibold tabular-nums">${estimatedUsageCost.toFixed(2)}</span>
                  </div>
                  <button type="button" onClick={() => router.replace("/?view=billing")} className="mt-4 flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                    Review billing <ChevronRight className="size-3" />
                  </button>
                </div>
              </div>
            </section>

            <section className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.8fr)]">
              <div className="overflow-hidden rounded-lg border bg-card">
                <div className="flex items-center justify-between border-b px-4 py-4 lg:px-5">
                  <div>
                    <h3 className="text-sm font-semibold">Recent generations</h3>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">Latest audio created by this workspace</p>
                  </div>
                  <Link href="/text-to-speech" className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline">View all <ChevronRight className="size-3" /></Link>
                </div>
                {generations.length ? (
                  <div className="divide-y">
                    {generations.slice(0, 6).map((generation, index) => (
                      <Link key={generation.id} href={`/text-to-speech/${generation.id}`} className="grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/45 lg:grid-cols-[36px_minmax(0,1fr)_130px_80px_90px] lg:px-5">
                        <span className="flex size-8 items-center justify-center rounded-md border bg-background text-muted-foreground">
                          {index === 0 ? <Pause className="size-3.5" /> : <Play className="ml-0.5 size-3.5" />}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold">{generation.text}</p>
                          <p className="mt-1 text-[10px] text-muted-foreground lg:hidden">{generation.voiceName} · {generation.text.length} chars</p>
                        </div>
                        <span className="hidden truncate text-xs text-muted-foreground lg:block">{generation.voiceName}</span>
                        <span className="hidden text-xs tabular-nums text-muted-foreground lg:block">{generation.text.length}</span>
                        <span className="text-right text-[11px] text-muted-foreground">{timeAgo(generation.createdAt)}</span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="px-5 py-12 text-center">
                    <p className="text-sm font-semibold">Nothing generated yet</p>
                    <p className="mt-1 text-xs text-muted-foreground">Your completed audio will appear here.</p>
                  </div>
                )}
              </div>

              <div className="rounded-lg border bg-card">
                <div className="flex items-center justify-between border-b px-5 py-4">
                  <div>
                    <h3 className="text-sm font-semibold">Most-used voices</h3>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">Ranked by generation count</p>
                  </div>
                  <Mic2 className="size-4 text-muted-foreground" />
                </div>
                <div className="space-y-4 p-5">
                  {voiceUsage.length ? voiceUsage.map((voice, index) => (
                    <div key={voice.name}>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="text-[10px] font-semibold text-muted-foreground">0{index + 1}</span>
                          <span className="truncate text-xs font-semibold">{voice.name}</span>
                        </div>
                        <span className="text-[11px] tabular-nums text-muted-foreground">{voice.count} jobs</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-[#ef765f]" style={{ width: `${voice.width}%` }} /></div>
                    </div>
                  )) : <p className="py-8 text-center text-xs text-muted-foreground">Voice rankings appear after generation.</p>}
                </div>
                <div className="border-t px-5 py-3">
                  <Link href="/voices" className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline">Open voice library <ChevronRight className="size-3" /></Link>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
