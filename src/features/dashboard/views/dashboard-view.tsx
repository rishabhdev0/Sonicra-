"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserButton, useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import {
  AudioLines,
  Bell,
  BookOpenText,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  Crown,
  Globe2,
  Library,
  Mic2,
  MoreVertical,
  Pause,
  Play,
  Sparkles,
  Star,
  TrendingDown,
  TrendingUp,
  Users,
  WandSparkles,
  X,
  type LucideIcon,
} from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Textarea } from "@/components/ui/textarea";
import { VoiceAvatar } from "@/components/voice-avatar/voice-avatar";
import { VoiceCreateDialog } from "@/features/voices/components/voice-create-dialog";
import { useCheckout } from "@/features/billing/hooks/use-checkout";
import { TEXT_MAX_LENGTH } from "@/features/text-to-speech/data/constants";
import { useAudioPlayback } from "@/hooks/use-audio-playback";
import { cn } from "@/lib/utils";
import type { AppRouter } from "@/trpc/routers/_app";
import { useTRPC } from "@/trpc/client";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type Generation = RouterOutputs["generations"]["getAll"][number];
type Voice = RouterOutputs["voices"]["getAll"]["system"][number];

const FREE_TIER_LIMIT = 10_000;
const TONES = [
  { label: "Natural", value: "0.8" },
  { label: "Warm", value: "0.65" },
  { label: "Expressive", value: "1.05" },
];
const USAGE_COLORS = ["#6d5dfc", "#3478f6", "#22a7f0", "#f59e0b"];

function compactNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: value >= 1_000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);
}

function timeAgo(value: Date | string) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1_000));
  if (seconds < 60) return "Just now";
  if (seconds < 3_600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3_600)} hr ago`;
  const days = Math.floor(seconds / 86_400);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function greetingForHour(hour: number) {
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  if (hour >= 17 && hour < 22) return "Good evening";
  return "Good night";
}

function getDelta(current: number, previous: number) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function MetricCard({
  label,
  value,
  detail,
  delta,
  icon: Icon,
  iconClassName,
}: {
  label: string;
  value: string;
  detail: string;
  delta?: number;
  icon: LucideIcon;
  iconClassName: string;
}) {
  return (
    <div className="min-h-32 rounded-2xl border border-[#e4e7ef] bg-white p-5 shadow-[0_10px_32px_rgba(74,85,125,0.045)]">
      <div className="flex items-start gap-4">
        <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-full", iconClassName)}>
          <Icon className="size-5" strokeWidth={1.9} />
        </span>
        <div className="min-w-0">
          <p className="text-[12px] font-medium text-[#526079]">{label}</p>
          <p className="mt-1 text-[24px] font-bold leading-none tabular-nums text-[#111323]">{value}</p>
          <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[10px]">
            {delta !== undefined && (
              <span className={cn("flex items-center gap-1 font-semibold", delta > 0 ? "text-[#2876f3]" : delta < 0 ? "text-rose-600" : "text-muted-foreground")}>
                {delta > 0 ? <TrendingUp className="size-3" /> : delta < 0 ? <TrendingDown className="size-3" /> : null}
                {delta > 0 ? "+" : ""}{delta}%
              </span>
            )}
            <span className="text-muted-foreground">{detail}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickCreate({ voices }: { voices: Voice[] }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [voiceId, setVoiceId] = useState("");
  const [tone, setTone] = useState(TONES[0].value);

  const effectiveVoiceId = voiceId || voices[0]?.id || "";
  const selectedVoice = voices.find((voice) => voice.id === effectiveVoiceId) ?? voices[0];

  function continueToStudio() {
    const trimmed = text.trim();
    if (!trimmed || !selectedVoice) return;
    sessionStorage.setItem("tts-prefill", trimmed);
    router.push(`/text-to-speech?voiceId=${encodeURIComponent(selectedVoice.id)}&temperature=${tone}`);
  }

  return (
    <section className="rounded-2xl border bg-card p-5 shadow-[0_8px_28px_rgba(15,23,42,0.035)] sm:p-6">
      <div className="flex items-start gap-3">
        <Sparkles className="mt-0.5 size-5 text-primary" />
        <div>
          <h2 className="text-[16px] font-bold">Quick Create</h2>
          <p className="mt-1 text-[12px] text-muted-foreground">Turn your text into natural speech in the full generation studio.</p>
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-xl border border-input bg-white focus-within:border-primary/55 focus-within:ring-3 focus-within:ring-primary/10">
        <Textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          maxLength={TEXT_MAX_LENGTH}
          placeholder="Type or paste your text here..."
          className="min-h-36 resize-none rounded-none border-0 bg-transparent px-4 py-4 text-[13px] shadow-none focus-visible:ring-0"
        />
        <p className="px-4 pb-3 text-[10px] text-muted-foreground">{text.length.toLocaleString()} / {TEXT_MAX_LENGTH.toLocaleString()} characters</p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-[1.05fr_0.95fr_0.9fr_auto] xl:items-end">
        <label className="block min-w-0">
          <span className="mb-1.5 block text-[10px] font-medium text-muted-foreground">Voice</span>
          <Select value={effectiveVoiceId} onValueChange={setVoiceId} disabled={!voices.length}>
            <SelectTrigger className="h-10 w-full rounded-lg bg-white text-[12px] shadow-none">
              <SelectValue placeholder="No voices available" />
            </SelectTrigger>
            <SelectContent>
              {voices.map((voice) => (
                <SelectItem key={voice.id} value={voice.id}>
                  <VoiceAvatar seed={voice.id} name={voice.name} className="size-5" />
                  {voice.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>

        <label className="block min-w-0">
          <span className="mb-1.5 block text-[10px] font-medium text-muted-foreground">Language</span>
          <Select value={selectedVoice?.language ?? "unavailable"} disabled>
            <SelectTrigger className="h-10 w-full rounded-lg bg-white text-[12px] shadow-none">
              <Globe2 className="size-4 text-primary" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={selectedVoice?.language ?? "unavailable"}>{selectedVoice?.language ?? "Unavailable"}</SelectItem>
            </SelectContent>
          </Select>
        </label>

        <label className="block min-w-0">
          <span className="mb-1.5 block text-[10px] font-medium text-muted-foreground">Tone</span>
          <Select value={tone} onValueChange={setTone}>
            <SelectTrigger className="h-10 w-full rounded-lg bg-white text-[12px] shadow-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TONES.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </label>

        <Button className="h-10 rounded-lg px-5 text-[12px] font-semibold shadow-[0_8px_20px_rgba(109,93,252,0.24)] sm:col-span-3 xl:col-span-1" disabled={!text.trim() || !selectedVoice} onClick={continueToStudio}>
          <AudioLines className="size-4" />
          Continue to studio
        </Button>
      </div>
    </section>
  );
}

function RecentGenerationRow({ generation }: { generation: Generation }) {
  const { isPlaying, isLoading, togglePlay } = useAudioPlayback(`/api/audio/${generation.id}`);

  return (
    <div className="grid grid-cols-[36px_minmax(0,1fr)_auto_28px] items-center gap-2 py-2.5">
      <button
        type="button"
        onClick={togglePlay}
        disabled={isLoading}
        className="flex size-9 items-center justify-center rounded-full border bg-white text-primary transition-colors hover:border-primary/30 hover:bg-accent disabled:opacity-50"
        aria-label={isPlaying ? "Pause generation" : "Play generation"}
      >
        {isPlaying ? <Pause className="size-3.5" /> : <Play className="ml-0.5 size-3.5" />}
      </button>
      <div className="min-w-0">
        <p className="truncate text-[12px] font-semibold">{generation.text}</p>
        <p className="mt-1 truncate text-[10px] text-muted-foreground">{generation.voiceName} · {timeAgo(generation.createdAt)}</p>
      </div>
      <span className="hidden text-[10px] tabular-nums text-muted-foreground sm:block">{generation.text.length} chars</span>
      <Button asChild variant="ghost" size="icon-sm" className="size-7 text-muted-foreground">
        <Link href={`/text-to-speech/${generation.id}`} aria-label="Open generation">
          <MoreVertical className="size-4" />
        </Link>
      </Button>
    </div>
  );
}

function RecentGenerations({ generations }: { generations: Generation[] }) {
  return (
    <section className="rounded-2xl border bg-card p-5 shadow-[0_8px_28px_rgba(15,23,42,0.035)]">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[14px] font-bold">Recent voices</h2>
        <Link href="/text-to-speech" className="text-[11px] font-semibold text-primary hover:underline">View all</Link>
      </div>
      {generations.length ? (
        <div className="mt-3 divide-y">{generations.slice(0, 5).map((generation) => <RecentGenerationRow key={generation.id} generation={generation} />)}</div>
      ) : (
        <div className="py-10 text-center">
          <AudioLines className="mx-auto size-5 text-muted-foreground" />
          <p className="mt-3 text-[12px] font-semibold">No generations yet</p>
          <p className="mt-1 text-[10px] text-muted-foreground">Your latest audio will appear here.</p>
        </div>
      )}
      <Button asChild variant="outline" className="mt-3 h-9 w-full rounded-lg text-[11px] font-semibold shadow-none">
        <Link href="/text-to-speech">Go to generation history</Link>
      </Button>
    </section>
  );
}

function UsageOverview({ generations, usagePercent }: { generations: Generation[]; usagePercent: number }) {
  const data = useMemo(() => {
    const totals = new Map<string, number>();
    generations.forEach((generation) => totals.set(generation.voiceName, (totals.get(generation.voiceName) ?? 0) + generation.text.length));
    const ranked = [...totals.entries()].sort((a, b) => b[1] - a[1]);
    const visible = ranked.slice(0, 3).map(([name, value]) => ({ name, value }));
    const other = ranked.slice(3).reduce((sum, [, value]) => sum + value, 0);
    if (other) visible.push({ name: "Other voices", value: other });
    return visible;
  }, [generations]);
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <section className="rounded-2xl border bg-card p-5 shadow-[0_8px_28px_rgba(15,23,42,0.035)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[14px] font-bold">Usage overview</h2>
          <p className="mt-1 text-[10px] text-muted-foreground">Characters by voice</p>
        </div>
        <span className="rounded-lg border px-2.5 py-1.5 text-[10px] font-medium">All time</span>
      </div>

      {data.length ? (
        <div className="mt-4 grid items-center gap-3 sm:grid-cols-[150px_minmax(0,1fr)] xl:grid-cols-1 2xl:grid-cols-[150px_minmax(0,1fr)]">
          <div className="relative mx-auto h-[150px] w-[150px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" innerRadius={50} outerRadius={69} paddingAngle={2} stroke="none">
                  {data.map((item, index) => <Cell key={item.name} fill={USAGE_COLORS[index]} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[20px] font-bold tabular-nums">{usagePercent}%</span>
              <span className="text-[10px] text-muted-foreground">Used</span>
            </div>
          </div>
          <div className="space-y-3">
            {data.map((item, index) => (
              <div key={item.name} className="flex items-center gap-2 text-[10px]">
                <span className="size-2.5 rounded-sm" style={{ backgroundColor: USAGE_COLORS[index] }} />
                <span className="min-w-0 flex-1 truncate text-muted-foreground">{item.name}</span>
                <span className="font-semibold tabular-nums">{Math.round((item.value / total) * 100)}%</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="py-10 text-center text-[11px] text-muted-foreground">Usage appears after your first generation.</div>
      )}

      <div className="mt-4 border-t pt-4">
        <div className="flex items-center justify-between gap-3 text-[10px] text-muted-foreground">
          <span>{usagePercent}% of the free allowance used</span>
          <Link href="/?view=billing" className="font-semibold text-primary hover:underline">Review plan</Link>
        </div>
      </div>
    </section>
  );
}

function VoiceLibrary({ voices }: { voices: Voice[] }) {
  return (
    <section className="rounded-2xl border bg-card p-5 shadow-[0_8px_28px_rgba(15,23,42,0.035)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[14px] font-bold">Your voice library</h2>
          <p className="mt-1 text-[10px] text-muted-foreground">Continue with a voice already in your workspace.</p>
        </div>
        <Link href="/voices" className="text-[11px] font-semibold text-primary hover:underline">View all</Link>
      </div>

      {voices.length ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
          {voices.slice(0, 4).map((voice) => (
            <Link key={voice.id} href={`/text-to-speech?voiceId=${voice.id}`} className="group min-w-0 rounded-xl border bg-white p-4 transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-[0_10px_25px_rgba(109,93,252,0.08)]">
              <div className="flex items-start justify-between gap-2">
                <VoiceAvatar seed={voice.id} name={voice.name} className="size-11 border-2 border-white shadow-sm" />
                <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
              </div>
              <p className="mt-4 truncate text-[12px] font-bold">{voice.name}</p>
              <p className="mt-1 truncate text-[10px] text-muted-foreground">{voice.language} · {voice.category.toLowerCase().replaceAll("_", " ")}</p>
              <p className="mt-4 text-[9px] font-semibold uppercase text-primary">{voice.variant === "CUSTOM" ? "Custom voice" : "Built-in voice"}</p>
            </Link>
          ))}
        </div>
      ) : (
        <div className="py-10 text-center text-[11px] text-muted-foreground">No voices are available in this workspace.</div>
      )}
    </section>
  );
}

export function DashboardView({ billingView }: { billingView: boolean }) {
  const trpc = useTRPC();
  const router = useRouter();
  const { user } = useUser();
  const { checkout, isPending: checkoutPending } = useCheckout();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [voiceDialogOpen, setVoiceDialogOpen] = useState(false);
  const [greeting, setGreeting] = useState("Welcome back");

  useEffect(() => {
    const updateGreeting = () => setGreeting(greetingForHour(new Date().getHours()));
    updateGreeting();
    const interval = window.setInterval(updateGreeting, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const { data: generations = [] } = useQuery(trpc.generations.getAll.queryOptions());
  const { data: voiceGroups } = useQuery(trpc.voices.getAll.queryOptions());
  const { data: billing } = useQuery(trpc.billing.getStatus.queryOptions());
  const portalMutation = useMutation(trpc.billing.createPortalSession.mutationOptions({}));

  const allVoices = useMemo(() => [...(voiceGroups?.custom ?? []), ...(voiceGroups?.system ?? [])], [voiceGroups]);
  const totalCharacters = useMemo(() => generations.reduce((total, generation) => total + generation.text.length, 0), [generations]);
  const usagePercent = Math.min(100, Math.round((totalCharacters / FREE_TIER_LIMIT) * 100));

  const comparison = useMemo(() => {
    const currentStart = new Date();
    currentStart.setHours(0, 0, 0, 0);
    currentStart.setDate(currentStart.getDate() - 6);
    const previousStart = new Date(currentStart);
    previousStart.setDate(previousStart.getDate() - 7);
    const current = generations.filter((item) => new Date(item.createdAt) >= currentStart);
    const previous = generations.filter((item) => {
      const date = new Date(item.createdAt);
      return date >= previousStart && date < currentStart;
    });
    const currentCharacters = current.reduce((sum, item) => sum + item.text.length, 0);
    const previousCharacters = previous.reduce((sum, item) => sum + item.text.length, 0);
    return {
      generations: getDelta(current.length, previous.length),
      characters: getDelta(currentCharacters, previousCharacters),
    };
  }, [generations]);

  function managePlan() {
    if (!billing?.hasActiveSubscription) {
      checkout();
      return;
    }
    portalMutation.mutate(undefined, {
      onSuccess: ({ portalUrl }) => window.open(portalUrl, "_blank", "noopener,noreferrer"),
    });
  }

  return (
    <div className="min-h-full bg-[#f7f8fc]">
      <VoiceCreateDialog open={voiceDialogOpen} onOpenChange={setVoiceDialogOpen} />

      <header className="mx-auto flex min-h-[104px] w-full max-w-[1600px] items-center justify-between gap-5 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <SidebarTrigger className="size-9 shrink-0 rounded-lg border bg-white md:hidden" />
          <div className="min-w-0">
            <h1 className="flex flex-wrap items-center gap-2 text-[22px] font-bold leading-tight text-[#111323] sm:text-[24px]">
              <span>{billingView ? "Billing & usage" : `${greeting}${user?.firstName ? `, ${user.firstName}` : ""}`}</span>
              {!billingView && <span role="img" aria-label="Waving hand" className="text-[22px]">👋</span>}
            </h1>
            <p className="mt-1.5 text-[12px] text-[#69758d] sm:text-[13px]">
              {billingView ? "Manage your plan and character allowance." : "Create lifelike voices in seconds with the power of AI."}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <Button variant="outline" className="hidden h-10 rounded-xl border-[#d9d4ff] bg-white px-4 text-[12px] font-semibold text-[#5b46e5] shadow-[0_5px_16px_rgba(61,72,120,0.035)] hover:border-[#c9c1ff] hover:bg-[#f5f3ff] sm:flex" onClick={managePlan} disabled={checkoutPending || portalMutation.isPending}>
            <Star className="size-4 fill-current" />
            {billing?.hasActiveSubscription ? "Manage plan" : "Upgrade plan"}
          </Button>
          <div className="relative">
            <Button variant="outline" size="icon" className="size-10 rounded-full border-[#e2e6ef] bg-white text-[#22283a] shadow-[0_5px_16px_rgba(61,72,120,0.035)] hover:border-[#d9d4ff] hover:bg-[#f5f3ff] hover:text-[#5b46e5]" onClick={() => setNotificationsOpen((open) => !open)} aria-label="Open notifications">
              <Bell className="size-4" />
              {generations.length > 0 && <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-primary" />}
            </Button>
            {notificationsOpen && (
              <div className="absolute right-0 top-12 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border bg-white shadow-[0_18px_50px_rgba(15,23,42,0.16)]">
                <div className="flex items-center justify-between border-b px-4 py-3">
                  <div>
                    <p className="text-[13px] font-semibold">Recent activity</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">Latest completed generations</p>
                  </div>
                  <Button variant="ghost" size="icon-sm" onClick={() => setNotificationsOpen(false)} aria-label="Close notifications"><X className="size-4" /></Button>
                </div>
                <div className="max-h-72 divide-y overflow-auto">
                  {generations.slice(0, 5).map((generation) => (
                    <Link key={generation.id} href={`/text-to-speech/${generation.id}`} className="block px-4 py-3 hover:bg-accent/60" onClick={() => setNotificationsOpen(false)}>
                      <p className="truncate text-[11px] font-semibold">{generation.text}</p>
                      <p className="mt-1 text-[10px] text-muted-foreground">{generation.voiceName} · {timeAgo(generation.createdAt)}</p>
                    </Link>
                  ))}
                  {!generations.length && <p className="px-4 py-8 text-center text-[11px] text-muted-foreground">No activity yet.</p>}
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2.5 border-l border-[#e3e6ee] pl-3.5">
            <UserButton appearance={{ elements: { avatarBox: "size-10! ring-2! ring-white! shadow-sm!" } }} />
            <div className="hidden min-w-0 lg:block">
              <p className="max-w-28 truncate text-[12px] font-semibold text-[#151827]">{user?.firstName ?? "Account"}</p>
              <p className="mt-0.5 text-[9px] text-[#7a8499]">{billing?.hasActiveSubscription ? "Pro Plan" : "Free Plan"}</p>
            </div>
            <ChevronDown className="hidden size-3.5 text-[#667085] lg:block" />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1600px] px-4 pb-8 sm:px-6 lg:px-8">
        {billingView ? (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.7fr)]">
            <section className="rounded-2xl border bg-white p-6 shadow-[0_8px_28px_rgba(15,23,42,0.035)]">
              <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
                <div>
                  <span className="rounded-md bg-accent px-2 py-1 text-[10px] font-semibold text-primary">{billing?.hasActiveSubscription ? "ACTIVE" : "FREE TIER"}</span>
                  <h2 className="mt-4 text-[22px] font-bold">{billing?.hasActiveSubscription ? "Sonicra Pro" : "Sonicra Free"}</h2>
                  <p className="mt-2 max-w-xl text-[12px] leading-5 text-muted-foreground">{billing?.hasActiveSubscription ? "Metered generation with premium workspace capabilities." : "10,000 characters are included before an active subscription is required."}</p>
                </div>
                <Button onClick={managePlan} disabled={checkoutPending || portalMutation.isPending} className="h-10 rounded-lg"><Crown className="size-4" />{billing?.hasActiveSubscription ? "Manage plan" : "Upgrade to Pro"}</Button>
              </div>
              <div className="mt-7 grid gap-3 border-t pt-6 sm:grid-cols-3">
                <MetricCard label="Characters generated" value={totalCharacters.toLocaleString()} detail="All time" icon={BookOpenText} iconClassName="bg-violet-50 text-primary" />
                <MetricCard label="Generations" value={generations.length.toLocaleString()} detail="Completed audio" icon={AudioLines} iconClassName="bg-blue-50 text-blue-600" />
                <MetricCard label="Available voices" value={allVoices.length.toLocaleString()} detail={`${voiceGroups?.custom.length ?? 0} custom`} icon={Mic2} iconClassName="bg-[#edf4ff] text-[#2876f3]" />
              </div>
            </section>
            <section className="rounded-2xl border bg-white p-6 shadow-[0_8px_28px_rgba(15,23,42,0.035)]">
              <div className="flex items-center justify-between"><h2 className="text-[14px] font-bold">Free allowance</h2><CircleDollarSign className="size-5 text-primary" /></div>
              <p className="mt-8 text-[34px] font-bold tabular-nums">{compactNumber(totalCharacters)}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">of {FREE_TIER_LIMIT.toLocaleString()} characters</p>
              <div className="mt-6 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-primary" style={{ width: `${usagePercent}%` }} /></div>
              <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground"><span>{usagePercent}% used</span><span>{Math.max(0, FREE_TIER_LIMIT - totalCharacters).toLocaleString()} remaining</span></div>
              <Button variant="outline" className="mt-7 h-9 w-full rounded-lg text-[11px]" onClick={() => router.push("/")}>Back to dashboard</Button>
            </section>
          </div>
        ) : (
          <div className="space-y-5">
            <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Voices generated" value={generations.length.toLocaleString()} delta={comparison.generations} detail="vs previous 7 days" icon={AudioLines} iconClassName="bg-[#efecff] text-[#6755f5]" />
              <MetricCard label="Characters generated" value={compactNumber(totalCharacters)} delta={comparison.characters} detail="vs previous 7 days" icon={BookOpenText} iconClassName="bg-[#edf4ff] text-[#2876f3]" />
              <MetricCard label="Voices available" value={allVoices.length.toLocaleString()} detail={`${voiceGroups?.custom.length ?? 0} custom · ${voiceGroups?.system.length ?? 0} built-in`} icon={Library} iconClassName="bg-[#fff3e8] text-[#f07a22]" />
              <MetricCard label="Free allowance used" value={`${usagePercent}%`} detail="of 10,000 characters" icon={Users} iconClassName="bg-[#edf3ff] text-[#2864f0]" />
            </section>

            <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
              <div className="space-y-5">
                <QuickCreate voices={allVoices} />
                <VoiceLibrary voices={allVoices} />
                <section className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-primary/10 bg-accent px-5 py-5 sm:flex-row sm:items-center sm:px-6">
                  <div className="flex items-center gap-4">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white text-primary shadow-sm"><WandSparkles className="size-5" /></span>
                    <div><h2 className="text-[13px] font-bold">Create a voice that belongs to your brand</h2><p className="mt-1 text-[10px] text-muted-foreground">Add a custom voice to this workspace and use it in the studio.</p></div>
                  </div>
                  <Button className="h-9 rounded-lg px-5 text-[11px] font-semibold" onClick={() => setVoiceDialogOpen(true)}><Mic2 className="size-4" />Clone a voice</Button>
                </section>
              </div>
              <aside className="space-y-5">
                <RecentGenerations generations={generations} />
                <UsageOverview generations={generations} usagePercent={usagePercent} />
              </aside>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
