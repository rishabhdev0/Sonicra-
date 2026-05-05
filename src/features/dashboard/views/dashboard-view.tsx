"use client";

import { useUser } from "@clerk/nextjs";
import { ThemeToggle } from "@/components/theme-toggle";

import {
  AudioLines,
  ChevronRight,
  Play,
  Mic,
  BookOpen,
  Podcast,
  Download,
  Share2,
  Activity,
  Sparkles,
  Gauge,
  TrendingUp,
  Wand2,
  Radio,
  Layers3,
  Clock3,
  BarChart3,
  Check,
  Menu,
  X,
} from "lucide-react";
import Link from "next/link";
import { useState, useMemo, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
  ComposedChart,
  Line,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
} from "recharts";
import { PageHeader } from "@/components/page-header";
import { useTRPC } from "@/trpc/client";
import { cn } from "@/lib/utils";
import { COST_PER_UNIT } from "@/features/text-to-speech/data/constants";

function timeAgo(date: Date) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString();
}

const BAR_COLORS = ["#0f766e", "#0e7490", "#64748b", "#14b8a6", "#475569", "#94a3b8"];
const PERIODS = ["This Week", "Last Week", "This Month"];

export function DashboardView() {
  const { isLoaded, user } = useUser();
  const [activeTab, setActiveTab] = useState("Overview");
  const [period, setPeriod] = useState("This Week");
  const [showPeriodMenu, setShowPeriodMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const trpc = useTRPC();

  const { data: generations } = useQuery(trpc.generations.getAll.queryOptions());
  const { data: voices } = useQuery(trpc.voices.getAll.queryOptions());
  const { data: billing } = useQuery(trpc.billing.getStatus.queryOptions());

  const totalChars = useMemo(() => generations?.reduce((s, g) => s + (g.text?.length ?? 0), 0) ?? 0, [generations]);
  const genCount = generations?.length ?? 0;
  const customVoices = voices?.custom?.length ?? 0;
  const systemVoices = voices?.system?.length ?? 0;
  const avgChars = genCount > 0 ? Math.round(totalChars / genCount) : 0;
  const uniqueVoices = new Set(generations?.map(g => g.voiceName)).size;
  const days = period === "This Month" ? 30 : 7;
  const periodOffset = period === "Last Week" ? 7 : 0;

  const chartData = useMemo(() => Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - periodOffset - (days - 1 - i));
    const prev = new Date(d);
    prev.setDate(prev.getDate() - days);
    const label = d.toLocaleDateString("en", { month: "short", day: "numeric" });
    const current = generations?.filter(g => new Date(g.createdAt).toDateString() === d.toDateString()) ?? [];
    const previous = generations?.filter(g => new Date(g.createdAt).toDateString() === prev.toDateString()) ?? [];
    return {
      label,
      thisWeek: current.length,
      lastWeek: previous.length,
      chars: current.reduce((s, g) => s + (g.text?.length ?? 0), 0),
    };
  }), [generations, days, periodOffset]);

  const charsByDay = useMemo(() => Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - periodOffset - (days - 1 - i));
    const label = d.toLocaleDateString("en", { month: "short", day: "numeric" });
    const chars = generations?.filter(g => new Date(g.createdAt).toDateString() === d.toDateString())
      .reduce((s, g) => s + (g.text?.length ?? 0), 0) ?? 0;
    return { label, chars };
  }), [generations, days, periodOffset]);

  const voiceBarData = useMemo(() => {
    const m: Record<string, number> = {};
    generations?.forEach(g => {
      const n = g.voiceName ?? "Unknown";
      m[n] = (m[n] ?? 0) + 1;
    });
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, value]) => ({
      name: name.length > 9 ? `${name.slice(0, 9)}...` : name,
      value,
    }));
  }, [generations]);

  const categoryData = useMemo(() => {
    const m: Record<string, number> = {};
    voices?.system?.forEach((v: any) => {
      if (v.category) m[v.category] = (m[v.category] ?? 0) + 1;
    });
    return Object.entries(m).slice(0, 5).map(([name, value]) => ({ name, value }));
  }, [voices]);

  const weekCount = chartData.reduce((s, d) => s + d.thisWeek, 0);
  const previousCount = chartData.reduce((s, d) => s + d.lastWeek, 0);
  const periodChars = chartData.reduce((s, d) => s + d.chars, 0);
  const activeDays = chartData.filter(d => d.thisWeek > 0).length;
  const peakDay = chartData.reduce((best, d) => d.thisWeek > best.thisWeek ? d : best, chartData[0] ?? { label: "-", thisWeek: 0, lastWeek: 0, chars: 0 });
  const chartHasActivity = chartData.some(d => d.thisWeek > 0 || d.lastWeek > 0);
  const periodDelta = previousCount > 0 ? Math.round(((weekCount - previousCount) / previousCount) * 100) : weekCount > 0 ? 100 : 0;
  const usageScore = Math.min(100, Math.max(4, Math.round((activeDays / days) * 100)));
  const voiceCoverage = systemVoices + customVoices > 0 ? Math.round((uniqueVoices / (systemVoices + customVoices)) * 100) : 0;

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href).then(() => alert("Link copied!"));
  };

  const handleExport = () => {
    if (!generations?.length) return alert("No data to export yet.");
    const csv = ["Voice,Text,Characters,Date",
      ...generations.map(g => `"${g.voiceName ?? ""}","${(g.text ?? "").replace(/"/g, '""')}",${g.text?.length ?? 0},${new Date(g.createdAt).toLocaleDateString()}`)
    ].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "sonicra-generations.csv";
    a.click();
  };

  const stats = [
    { label: "Total Generations", value: fmt(genCount), change: "All time", up: null },
    { label: "Characters Used", value: fmt(totalChars), change: totalChars > 0 ? `+${fmt(totalChars)}` : "-", up: totalChars > 0 },
    { label: "Available Voices", value: `${systemVoices + customVoices}`, change: `${customVoices} custom`, up: null },
    { label: "This Period", value: `${weekCount}`, change: weekCount > 0 ? "Active" : "No activity", up: weekCount > 0 ? true : null },
    { label: "Avg Length", value: `${avgChars}`, change: "chars/gen", up: null },
    { label: "Unique Voices", value: `${uniqueVoices}`, change: "used so far", up: null },
  ];

  const statIcons = [BarChart3, Wand2, Layers3, Activity, Clock3, AudioLines];

  const quickActions = [
    { title: "Narrate a Story", desc: "Long-form expressive narration", icon: BookOpen, href: "/text-to-speech" },
    { title: "Record an Ad", desc: "Clean commercial delivery", icon: Radio, href: "/text-to-speech" },
    { title: "Voice a Character", desc: "Distinct character performance", icon: Mic, href: "/text-to-speech" },
    { title: "Podcast Intro", desc: "Warm branded opening", icon: Podcast, href: "/text-to-speech" },
  ];

  const tipStyle = {
    fontSize: 12,
    borderRadius: 12,
    border: "1px solid #e2e8f0",
    boxShadow: "0 18px 45px rgba(15,23,42,0.12)",
  };

  const Panel = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
    <div className={cn("bg-white rounded-xl border border-slate-200 shadow-[0_10px_30px_rgba(15,23,42,0.045)] overflow-hidden", className)}>
      {children}
    </div>
  );

  // ─── ANALYTICS ────────────────────────────────────────────────────────────
  const AnalyticsView = () => (
    <div className="space-y-4 sm:space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: "Total Generations", value: fmt(genCount), color: "text-teal-700", bg: "bg-teal-50 border-teal-100" },
          { label: "Total Characters", value: fmt(totalChars), color: "text-cyan-700", bg: "bg-cyan-50 border-cyan-100" },
          { label: "Avg per Generation", value: `${avgChars}`, color: "text-slate-900", bg: "bg-white border-slate-200" },
          { label: "Unique Voices Used", value: `${uniqueVoices}`, color: "text-slate-900", bg: "bg-white border-slate-200" },
        ].map(s => (
          <div key={s.label} className={cn("rounded-xl border p-4 sm:p-5 shadow-sm", s.bg)}>
            <p className="text-[10.5px] sm:text-[11px] text-slate-500 font-medium mb-2">{s.label}</p>
            <p className={cn("text-[22px] sm:text-[28px] font-extrabold tracking-tight", s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
        <Panel>
          <div className="px-4 sm:px-6 py-4 border-b border-slate-100">
            <p className="text-[14px] font-bold text-slate-900">Generations Over Time</p>
            <p className="text-[11.5px] text-slate-500 mt-0.5">Daily count · {period.toLowerCase()}</p>
          </div>
          <div className="px-2 sm:px-4 pb-4 pt-3" style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -28, bottom: 0 }}>
                <defs>
                  <linearGradient id="ag1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0f766e" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="#0f766e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 8" stroke="#edf2f7" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: "#94a3b8" }} tickLine={false} axisLine={false} interval={Math.floor(days / 5)} />
                <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tipStyle} formatter={(v: any) => [v, "Generations"]} />
                <Area type="monotone" dataKey="thisWeek" stroke="#0f766e" strokeWidth={2.5} fill="url(#ag1)" dot={false} activeDot={{ r: 4, fill: "#0f766e", stroke: "#fff", strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel>
          <div className="px-4 sm:px-6 py-4 border-b border-slate-100">
            <p className="text-[14px] font-bold text-slate-900">Characters Over Time</p>
            <p className="text-[11.5px] text-slate-500 mt-0.5">Total chars per day · {period.toLowerCase()}</p>
          </div>
          <div className="px-2 sm:px-4 pb-4 pt-3" style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charsByDay} margin={{ top: 8, right: 8, left: -28, bottom: 0 }}>
                <defs>
                  <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0e7490" stopOpacity={0.16} />
                    <stop offset="100%" stopColor="#0e7490" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 8" stroke="#edf2f7" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: "#94a3b8" }} tickLine={false} axisLine={false} interval={Math.floor(days / 5)} />
                <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tipStyle} formatter={(v: any) => [v, "Characters"]} />
                <Area type="monotone" dataKey="chars" stroke="#0e7490" strokeWidth={2.5} fill="url(#cg)" dot={false} activeDot={{ r: 4, fill: "#0e7490", stroke: "#fff", strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_280px] gap-4 sm:gap-5">
        <Panel>
          <div className="px-4 sm:px-6 py-4 border-b border-slate-100">
            <p className="text-[14px] font-bold text-slate-900">Voice Usage Breakdown</p>
            <p className="text-[11.5px] text-slate-500 mt-0.5">Generations per voice</p>
          </div>
          <div className="px-2 sm:px-4 pb-4 pt-3" style={{ height: 200 }}>
            {voiceBarData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={voiceBarData} margin={{ top: 4, right: 8, left: -28, bottom: 0 }} barSize={28}>
                  <CartesianGrid strokeDasharray="4 8" stroke="#edf2f7" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={tipStyle} formatter={(v: any) => [v, "Uses"]} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {voiceBarData.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-[12px] text-slate-400">Generate to see voice analytics</div>
            )}
          </div>
        </Panel>

        <Panel>
          <div className="px-4 sm:px-5 py-4 border-b border-slate-100">
            <p className="text-[14px] font-bold text-slate-900">Voice Categories</p>
            <p className="text-[11.5px] text-slate-500 mt-0.5">Library breakdown</p>
          </div>
          <div className="flex items-center justify-center" style={{ height: 200 }}>
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={52} outerRadius={80} dataKey="value" paddingAngle={3}>
                    {categoryData.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tipStyle} formatter={(v: any, _: any, p: any) => [v, p.payload.name]} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center">
                <div className="text-[28px] font-extrabold text-slate-900">{systemVoices}</div>
                <div className="text-[11px] text-slate-400 mt-1">Built-in voices</div>
                <div className="text-[28px] font-extrabold text-slate-900 mt-3">{customVoices}</div>
                <div className="text-[11px] text-slate-400 mt-1">Custom voices</div>
              </div>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );

  // ─── BILLING ──────────────────────────────────────────────────────────────
  const BillingView = () => {
    const estimatedCost = (billing?.estimatedCostCents ?? 0) / 100;
    const isActive = billing?.hasActiveSubscription;

    const freeTier = [
      { feature: "10,000 characters / month", included: true },
      { feature: "5 system voices", included: true },
      { feature: "Standard processing speed", included: true },
      { feature: "Custom voice cloning", included: false },
      { feature: "Generation history", included: false },
      { feature: "Usage analytics", included: false },
      { feature: "Priority processing", included: false },
    ];

    const proTier = [
      { feature: "Unlimited characters", included: true },
      { feature: "20+ premium system voices", included: true },
      { feature: "Priority processing speed", included: true },
      { feature: "Custom voice cloning", included: true },
      { feature: "Full generation history", included: true },
      { feature: "Advanced usage analytics", included: true },
      { feature: "Pay-as-you-go · $0.30 / 1k chars", included: true },
    ];

    return (
      <div className="space-y-5">
        {/* Current usage banner */}
        {isActive && (
          <Panel>
            <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="size-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                  <AudioLines className="size-5 text-emerald-700" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-[14px] font-bold text-slate-900">Sonicra Pro</p>
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                      Active
                    </span>
                  </div>
                  <p className="text-[12px] text-slate-500 mt-0.5">
                    $0.60 / month base · $0.30 per 1,000 characters
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6 shrink-0">
                <div className="text-right">
                  <p className="text-[11px] text-slate-400 font-medium">This period</p>
                  <p className="text-[26px] font-extrabold text-slate-950 leading-none mt-0.5">
                    ${estimatedCost.toFixed(2)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-slate-400 font-medium">Characters</p>
                  <p className="text-[26px] font-extrabold text-slate-950 leading-none mt-0.5">
                    {fmt(totalChars)}
                  </p>
                </div>
              </div>
            </div>
          </Panel>
        )}

        {/* Pricing tiers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
          {/* Free tier */}
          <Panel>
            <div className="px-6 py-5 border-b border-slate-100">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Free</p>
                  <div className="flex items-end gap-1.5 mt-2">
                    <p className="text-[32px] font-extrabold leading-none text-slate-950">$0</p>
                    <p className="text-[12px] text-slate-400 mb-1">/ month</p>
                  </div>
                  <p className="text-[12px] text-slate-500 mt-2">Get started with basic voice generation.</p>
                </div>
                {!isActive && (
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-500">
                    Current
                  </span>
                )}
              </div>
            </div>
            <div className="px-6 py-5 space-y-3.5">
              {freeTier.map(({ feature, included }) => (
                <div key={feature} className="flex items-center gap-3">
                  <span className={`size-5 rounded-full flex items-center justify-center shrink-0 ${included ? "bg-slate-100 border border-slate-200" : "bg-slate-50 border border-slate-100"}`}>
                    {included
                      ? <Check className="size-3 text-slate-600" />
                      : <X className="size-3 text-slate-300" />
                    }
                  </span>
                  <span className={`text-[12.5px] font-medium ${included ? "text-slate-700" : "text-slate-300"}`}>
                    {feature}
                  </span>
                </div>
              ))}
            </div>
            <div className="px-6 pb-6">
              <button disabled className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-[12.5px] font-bold text-slate-400 cursor-not-allowed">
                Free plan
              </button>
            </div>
          </Panel>

          {/* Pro tier */}
          <Panel className="border-slate-900 ring-1 ring-slate-900/10">
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-950 rounded-t-xl">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Pro</p>
                  <div className="flex items-end gap-1.5 mt-2">
                    <p className="text-[32px] font-extrabold leading-none text-white">$0.60</p>
                    <p className="text-[12px] text-slate-400 mb-1">/ month</p>
                  </div>
                  <p className="text-[12px] text-slate-400 mt-2">+ $0.30 per 1,000 characters used</p>
                </div>
                {isActive && (
                  <span className="rounded-full border border-emerald-500/30 bg-emerald-500/20 px-2.5 py-1 text-[10px] font-bold text-emerald-400">
                    Your plan
                  </span>
                )}
              </div>
            </div>
            <div className="px-6 py-5 space-y-3.5">
              {proTier.map(({ feature }) => (
                <div key={feature} className="flex items-center gap-3">
                  <span className="size-5 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                    <Check className="size-3 text-emerald-600" />
                  </span>
                  <span className="text-[12.5px] font-medium text-slate-700">{feature}</span>
                </div>
              ))}
            </div>
            <div className="px-6 pb-6">
              {isActive ? (
                <div className="w-full rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-2.5 text-center">
                  <p className="text-[12.5px] font-bold text-emerald-700">✓ You&apos;re on Pro</p>
                </div>
              ) : (
                <button className="w-full rounded-lg bg-slate-950 px-4 py-2.5 text-[12.5px] font-bold text-white hover:bg-slate-800 transition-colors shadow-sm">
                  Upgrade to Pro
                </button>
              )}
            </div>
          </Panel>
        </div>

        {/* Usage breakdown */}
        {isActive && (
          <Panel>
            <div className="px-6 py-4 border-b border-slate-100">
              <p className="text-[13.5px] font-bold text-slate-900">Usage Breakdown</p>
              <p className="text-[11.5px] text-slate-500 mt-0.5">Current billing period</p>
            </div>
            <div className="divide-y divide-slate-50">
              {[
                { label: "Base subscription", amount: "$0.60", note: "Monthly flat fee" },
                { label: "Characters used", amount: `${fmt(totalChars)} chars`, note: `$${(totalChars * COST_PER_UNIT).toFixed(4)} at $0.30/1k` },
                { label: "Generations made", amount: `${fmt(genCount)}`, note: "Total this period" },
                { label: "Estimated total", amount: `$${estimatedCost.toFixed(2)}`, note: "Sandbox · not charged", bold: true },
              ].map(({ label, amount, note, bold }) => (
                <div key={label} className="flex items-center justify-between px-6 py-3.5 gap-3">
                  <div>
                    <p className={`text-[13px] font-semibold ${bold ? "text-slate-900" : "text-slate-700"}`}>{label}</p>
                    <p className="text-[11.5px] text-slate-400 mt-0.5">{note}</p>
                  </div>
                  <p className={`text-[14px] font-extrabold shrink-0 ${bold ? "text-slate-950" : "text-slate-700"}`}>{amount}</p>
                </div>
              ))}
            </div>
          </Panel>
        )}
      </div>
    );
  };

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50/70">
      <PageHeader title="Dashboard" className="lg:hidden" />

      <div className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
        <div className="px-4 sm:px-7 h-14 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-[15px] sm:text-[17px] font-bold text-slate-900 tracking-tight leading-none truncate">
              Good morning, <span className="text-teal-700">{isLoaded ? (user?.firstName ?? "there") : "..."}</span> 👋
            </h1>
            <p className="hidden sm:block text-[11.5px] text-slate-500 mt-1">Production-ready voice workspace overview</p>
          </div>
          <div className="hidden sm:flex items-center gap-2">
             {/* <ThemeToggle /> */}
            <button onClick={handleShare} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 text-[12px] font-medium transition-all">
              <Share2 className="size-3.5" /> Share
            </button>
            <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 text-[12px] font-medium transition-all">
              <Download className="size-3.5" /> Export CSV
            </button>
            <Link href="/text-to-speech" className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-slate-950 text-white text-[12px] font-semibold shadow-sm hover:bg-slate-800 transition-all">
              <AudioLines className="size-3.5" /> Generate
            </Link>
          </div>
          <div className="flex sm:hidden items-center gap-2 shrink-0">
            <Link href="/text-to-speech" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950 text-white text-[12px] font-semibold shadow-sm">
              <AudioLines className="size-3.5" /> Generate
            </Link>
            <button
              onClick={() => setMobileMenuOpen(v => !v)}
              className="size-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shrink-0"
            >
              {mobileMenuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="sm:hidden px-4 py-3 border-t border-slate-100 bg-white flex flex-col gap-2">
            <button onClick={handleShare} className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-slate-200 text-slate-600 text-[13px] font-medium w-full">
              <Share2 className="size-4" /> Share dashboard
            </button>
            <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-slate-200 text-slate-600 text-[13px] font-medium w-full">
              <Download className="size-4" /> Export CSV
            </button>
          </div>
        )}

        <div className="px-4 sm:px-7 flex items-center justify-between border-t border-slate-100 overflow-x-auto">
          <div className="flex shrink-0">
            {(["Overview", "Analytics", "Billing"] as const).map(t => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={cn(
                  "px-3 sm:px-4 py-2.5 text-[12px] sm:text-[13px] font-medium border-b-2 transition-all whitespace-nowrap",
                  activeTab === t ? "text-teal-700 border-teal-700 font-semibold" : "text-slate-400 border-transparent hover:text-slate-700"
                )}
              >
                {t}
              </button>
            ))}
            <Link href="/voices" className="px-3 sm:px-4 py-2.5 text-[12px] sm:text-[13px] font-medium text-slate-400 border-b-2 border-transparent hover:text-slate-700 transition-all whitespace-nowrap">
              Voices
            </Link>
            <Link href="/text-to-speech" className="px-3 sm:px-4 py-2.5 text-[12px] sm:text-[13px] font-medium text-slate-400 border-b-2 border-transparent hover:text-slate-700 transition-all whitespace-nowrap">
              History
            </Link>
          </div>
          <div className="relative my-1.5 ml-2 shrink-0">
            <button
              onClick={() => setShowPeriodMenu(p => !p)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 text-[11.5px] font-medium hover:bg-slate-50 transition-all whitespace-nowrap"
            >
              {period} <span className="text-slate-400 text-[10px]">▾</span>
            </button>
            {showPeriodMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-50 min-w-[140px]">
                {PERIODS.map(p => (
                  <button
                    key={p}
                    onClick={() => { setPeriod(p); setShowPeriodMenu(false); }}
                    className={cn("w-full text-left px-4 py-2 text-[12.5px] hover:bg-slate-50 transition-colors whitespace-nowrap", period === p ? "text-teal-700 font-semibold" : "text-slate-600")}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-7 py-4 sm:py-6 space-y-4 sm:space-y-5">
        {activeTab === "Analytics" && <AnalyticsView />}
        {activeTab === "Billing" && <BillingView />}

        {activeTab === "Overview" && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {stats.map((s, i) => {
                const Icon = statIcons[i] ?? BarChart3;
                return (
                  <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div className="size-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center">
                        <Icon className="size-4 text-slate-600" />
                      </div>
                      <p className={cn("text-[10.5px] font-bold", s.up === true ? "text-emerald-600" : s.up === false ? "text-red-500" : "text-slate-400")}>
                        {s.change}
                      </p>
                    </div>
                    <p className="text-[10.5px] font-medium text-slate-500">{s.label}</p>
                    <p className="mt-1 text-[20px] sm:text-[24px] font-extrabold text-slate-950 tracking-tight leading-none">{s.value}</p>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-4 sm:gap-5">
              <Panel>
                <div className="px-4 sm:px-6 py-4 border-b border-slate-100">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div>
                      <p className="text-[14px] font-bold text-slate-900">Generation Performance</p>
                      <p className="text-[11.5px] text-slate-500 mt-1">Volume, characters, and trend · {period.toLowerCase()}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="rounded-lg border border-teal-100 bg-teal-50 px-3 py-1.5">
                        <p className="text-[10px] font-semibold text-teal-700">This period</p>
                        <p className="text-[16px] font-extrabold text-teal-900 leading-none mt-0.5">{weekCount}</p>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-white px-3 py-1.5">
                        <p className="text-[10px] font-semibold text-slate-400">Previous</p>
                        <p className="text-[16px] font-extrabold text-slate-700 leading-none mt-0.5">{previousCount}</p>
                      </div>
                      <div className={cn("rounded-lg border px-3 py-1.5", periodDelta >= 0 ? "border-emerald-100 bg-emerald-50" : "border-red-100 bg-red-50")}>
                        <p className={cn("text-[10px] font-semibold", periodDelta >= 0 ? "text-emerald-600" : "text-red-500")}>Change</p>
                        <p className={cn("text-[16px] font-extrabold leading-none mt-0.5", periodDelta >= 0 ? "text-emerald-800" : "text-red-700")}>
                          {periodDelta >= 0 ? "+" : ""}{periodDelta}%
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="px-2 sm:px-4 pb-4 pt-3" style={{ height: 260 }}>
                  {chartHasActivity ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={chartData} margin={{ top: 14, right: 8, left: -24, bottom: 0 }}>
                        <defs>
                          <linearGradient id="premiumArea" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#0f766e" stopOpacity={0.18} />
                            <stop offset="100%" stopColor="#0f766e" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="premiumBar" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#5eead4" stopOpacity={0.9} />
                            <stop offset="100%" stopColor="#0f766e" stopOpacity={0.72} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="4 8" stroke="#edf2f7" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 9, fill: "#94a3b8" }} tickLine={false} axisLine={false} interval={Math.floor(days / 5)} />
                        <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} tickLine={false} axisLine={false} allowDecimals={false} />
                        <Tooltip contentStyle={tipStyle} cursor={{ fill: "rgba(15,118,110,0.04)" }} />
                        <Bar dataKey="chars" name="Characters" fill="url(#premiumBar)" radius={[7, 7, 0, 0]} barSize={14} opacity={0.7} />
                        <Area type="monotone" dataKey="lastWeek" name="Previous generations" stroke="#cbd5e1" strokeWidth={2} strokeDasharray="6 6" fill="transparent" dot={false} />
                        <Area type="monotone" dataKey="thisWeek" name="Generations" stroke="#0f766e" strokeWidth={2.75} fill="url(#premiumArea)" dot={false} activeDot={{ r: 5, fill: "#0f766e", stroke: "#fff", strokeWidth: 2 }} />
                        <Line type="monotone" dataKey="thisWeek" stroke="#0e7490" strokeWidth={1.5} dot={false} opacity={0.55} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full rounded-xl border border-dashed border-slate-200 bg-slate-50 flex items-center justify-center">
                      <div className="text-center max-w-[260px] px-4">
                        <div className="mx-auto size-12 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center">
                          <Activity className="size-5 text-slate-600" />
                        </div>
                        <p className="text-[13px] font-bold text-slate-900 mt-3">No activity in this period</p>
                        <p className="text-[11.5px] text-slate-400 mt-1">Switch the range or create a new generation to populate this chart.</p>
                      </div>
                    </div>
                  )}
                </div>
              </Panel>

              <Panel>
                <div className="p-4 sm:p-5 border-b border-slate-100">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 mb-1">Status Summary</p>
                      <p className="text-[28px] sm:text-[32px] font-extrabold tracking-tight leading-none text-slate-950">{fmt(totalChars)}</p>
                      <p className="text-[11.5px] text-slate-500 mt-1.5">Total characters generated</p>
                    </div>
                    <div className="size-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center">
                      <Sparkles className="size-5 text-teal-700" />
                    </div>
                  </div>
                  <div className="grid grid-cols-[110px_1fr] gap-4 items-center mt-4">
                    <div className="relative" style={{ height: 110 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <RadialBarChart innerRadius="72%" outerRadius="100%" data={[{ name: "Score", value: usageScore }]} startAngle={90} endAngle={-270}>
                          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                          <RadialBar dataKey="value" cornerRadius={12} fill="#0f766e" background={{ fill: "#e2e8f0" }} />
                        </RadialBarChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-[22px] font-extrabold leading-none text-slate-950">{usageScore}</span>
                        <span className="text-[10px] text-slate-500 mt-1">score</span>
                      </div>
                    </div>
                    <div className="space-y-2.5">
                      {[
                        ["Active days", `${activeDays}/${days}`],
                        ["Peak day", `${peakDay.thisWeek} gen`],
                        ["Period chars", fmt(periodChars)],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] text-slate-500">{label}</span>
                            <span className="text-[13px] font-bold text-slate-900">{value}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 divide-x divide-slate-100">
                  {[
                    { label: "Voices", value: systemVoices + customVoices, icon: AudioLines },
                    { label: "Generations", value: genCount, icon: TrendingUp },
                    { label: "Coverage", value: `${voiceCoverage}%`, icon: Gauge },
                  ].map(item => (
                    <div key={item.label} className="p-4">
                      <item.icon className="size-4 text-teal-700 mb-2" />
                      <p className="text-[16px] sm:text-[18px] font-extrabold text-slate-900 leading-none">{item.value}</p>
                      <p className="text-[10.5px] text-slate-400 mt-1">{item.label}</p>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              <Panel>
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                  <p className="text-[13.5px] font-bold text-slate-900">Recent Generations</p>
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600">
                    <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" /> Live
                  </div>
                </div>
                {generations && generations.length > 0 ? (
                  <div className="divide-y divide-slate-50">
                    {generations.slice(0, 4).map(g => (
                      <Link key={g.id} href={`/text-to-speech/${g.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors group">
                        <div className="size-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
                          <Play className="size-3 text-teal-700" strokeWidth={2} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12.5px] font-semibold text-slate-700 group-hover:text-teal-700 transition-colors truncate">{g.voiceName ?? "Unknown"}</p>
                          <p className="text-[11px] text-slate-400 truncate mt-0.5">{g.text?.slice(0, 42)}{(g.text?.length ?? 0) > 42 ? "..." : ""}</p>
                        </div>
                        <p className="text-[10.5px] text-slate-300 shrink-0">{timeAgo(g.createdAt)}</p>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 gap-3">
                    <div className="size-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center">
                      <AudioLines className="size-5 text-slate-500" />
                    </div>
                    <p className="text-[12px] text-slate-400">No generations yet</p>
                    <Link href="/text-to-speech" className="text-[12px] text-teal-700 font-semibold hover:text-teal-800">Start generating</Link>
                  </div>
                )}
                {genCount > 4 && (
                  <div className="px-5 py-3 border-t border-slate-50">
                    <Link href="/text-to-speech" className="text-[11.5px] text-teal-700 hover:text-teal-800 flex items-center gap-1 font-medium">
                      View all {genCount} <ChevronRight className="size-3" />
                    </Link>
                  </div>
                )}
              </Panel>

              <Panel>
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                  <p className="text-[13.5px] font-bold text-slate-900">Voice Usage</p>
                  <Link href="/voices" className="text-[11px] text-slate-400 hover:text-teal-700 flex items-center gap-1 transition-colors">
                    Library <ChevronRight className="size-3" />
                  </Link>
                </div>
                <div className="p-5 space-y-3">
                  {voiceBarData.length > 0 ? voiceBarData.map(({ name, value }, i) => (
                    <div key={name}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[12.5px] font-medium text-slate-600">{name}</span>
                        <span className="text-[12px] font-bold text-slate-500">{value}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${(value / (voiceBarData[0]?.value || 1)) * 100}%`, backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }} />
                      </div>
                    </div>
                  )) : <p className="text-[12px] text-slate-400 text-center py-4">Generate to see voice usage</p>}
                </div>
                <div className="px-5 pb-4 grid grid-cols-2 gap-2">
                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                    <p className="text-[15px] font-extrabold text-slate-900">{systemVoices}</p>
                    <p className="text-[10.5px] text-slate-500 mt-0.5">Built-in voices</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                    <p className="text-[15px] font-extrabold text-slate-900">{customVoices}</p>
                    <p className="text-[10.5px] text-slate-500 mt-0.5">Custom voices</p>
                  </div>
                </div>
              </Panel>

              <Panel className="sm:col-span-2 lg:col-span-1">
                <div className="px-5 py-4 border-b border-slate-100">
                  <p className="text-[13.5px] font-bold text-slate-900">Quick Actions</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Common production workflows</p>
                </div>
                <div className="divide-y divide-slate-50">
                  {quickActions.map(a => (
                    <Link key={a.title} href={a.href} className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors group">
                      <div className="size-9 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center shrink-0">
                        <a.icon className="size-4 text-teal-700" strokeWidth={1.9} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12.5px] font-semibold text-slate-700 group-hover:text-teal-700 transition-colors">{a.title}</p>
                        <p className="text-[11px] text-slate-400">{a.desc}</p>
                      </div>
                      <ChevronRight className="size-4 text-slate-300 group-hover:text-teal-700 transition-colors shrink-0" />
                    </Link>
                  ))}
                </div>
              </Panel>
            </div>
          </>
        )}
      </div>
    </div>
  );
}