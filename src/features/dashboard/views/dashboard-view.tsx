"use client";

import { useUser } from "@clerk/nextjs";
import {
  Play, TrendingUp, TrendingDown, Plus, Mic,
  Settings, AudioLines, Menu, X, Bell, Mic2,
  Hash, Clock, ChevronRight, X as Close,
} from "lucide-react";
import Link from "next/link";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";
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

const tooltipStyle = {
  fontSize: 12,
  borderRadius: 8,
  border: "1px solid #e5e7eb",
  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
  backgroundColor: "#fff",
  color: "#111827",
};

export function DashboardView() {
  const { isLoaded, user } = useUser();
  const [activeTab, setActiveTab] = useState("Overview");
  const [chartPeriod, setChartPeriod] = useState("Daily");
  const [showPeriodMenu, setShowPeriodMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
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

  // Chart days based on period
  const days = chartPeriod === "Monthly" ? 30 : chartPeriod === "Weekly" ? 14 : 7;
  const periodOffset = 0;

  const chartData = useMemo(() => Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - periodOffset - (days - 1 - i));
    const prev = new Date(d);
    prev.setDate(prev.getDate() - days);
    const label = chartPeriod === "Monthly"
      ? d.toLocaleDateString("en", { month: "short", day: "numeric" })
      : chartPeriod === "Weekly"
      ? d.toLocaleDateString("en", { weekday: "short", day: "numeric" })
      : d.toLocaleDateString("en", { weekday: "short" });
    const current = generations?.filter(g => new Date(g.createdAt).toDateString() === d.toDateString()) ?? [];
    const previous = generations?.filter(g => new Date(g.createdAt).toDateString() === prev.toDateString()) ?? [];
    return {
      label,
      thisWeek: current.length,
      lastWeek: previous.length,
      chars: current.reduce((s, g) => s + (g.text?.length ?? 0), 0),
    };
  }), [generations, days, periodOffset, chartPeriod]);

  const voiceBarData = useMemo(() => {
    const m: Record<string, number> = {};
    generations?.forEach(g => {
      const n = g.voiceName ?? "Unknown";
      m[n] = (m[n] ?? 0) + 1;
    });
    const entries = Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const total = entries.reduce((s, [, v]) => s + v, 0);
    return entries.map(([name, value]) => ({
      name,
      value,
      pct: total > 0 ? Math.round((value / total) * 100) : 0,
      chars: value * avgChars,
    }));
  }, [generations, avgChars]);

  const weekCount = chartData.reduce((s, d) => s + d.thisWeek, 0);
  const previousCount = chartData.reduce((s, d) => s + d.lastWeek, 0);
  const periodDelta = previousCount > 0
    ? Math.round(((weekCount - previousCount) / previousCount) * 100)
    : weekCount > 0 ? 100 : 0;
  const chartHasActivity = chartData.some(d => d.thisWeek > 0);

  // Recent 5 generations as notifications
  const recentNotifications = generations?.slice(0, 5) ?? [];

  // ── BILLING ──────────────────────────────────────────────────
 const BillingView = () => {
    const estimatedCost = (billing?.estimatedCostCents ?? 0) / 100;
    const isActive = billing?.hasActiveSubscription;

    const freeTier = [
      { feature: "10,000 characters per month", included: true },
      { feature: "5 system voices", included: true },
      { feature: "Standard generation speed", included: true },
      { feature: "Custom voice cloning", included: false },
      { feature: "Generation history", included: false },
      { feature: "Usage analytics", included: false },
    ];

    const proTier = [
      { feature: "Unlimited characters", included: true },
      { feature: "20+ premium system voices", included: true },
      { feature: "Priority processing", included: true },
      { feature: "Custom voice cloning", included: true },
      { feature: "Full generation history", included: true },
      { feature: "Advanced analytics", included: true },
      { feature: "$0.30 per 1,000 characters", included: true },
    ];

    return (
      <div className="space-y-5 max-w-2xl">

        {/* Page title */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Billing</h2>
          <p className="text-sm text-gray-400 mt-0.5">Manage your plan and usage.</p>
        </div>

        {/* Current usage — only show if subscribed */}
        {isActive && (
          <div className="rounded-xl border border-gray-200 bg-white px-6 py-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
              <div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Active Plan</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1.5">Sonicra Pro</p>
                <p className="text-sm text-gray-400 mt-0.5">$0.60 / month · $0.30 per 1k characters</p>
              </div>
              <div className="flex gap-8 sm:text-right">
                <div>
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">This Period</p>
                  <p className="text-2xl font-semibold text-gray-900 mt-1.5 tabular-nums">${estimatedCost.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Characters</p>
                  <p className="text-2xl font-semibold text-gray-900 mt-1.5 tabular-nums">{fmt(totalChars)}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Plans side by side */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* Free */}
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden flex flex-col">
            <div className="px-6 py-5">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Free</p>
              <div className="flex items-baseline gap-1.5 mt-3">
                <span className="text-4xl font-semibold text-gray-900">$0</span>
                <span className="text-sm text-gray-400">/ month</span>
              </div>
            </div>

            <div className="h-px bg-gray-100 mx-6" />

            <div className="px-6 py-5 space-y-3 flex-1">
              {freeTier.map(({ feature, included }) => (
                <div key={feature} className="flex items-center gap-3">
                  {included ? (
                    <div className="size-[18px] rounded-full bg-gray-900 flex items-center justify-center shrink-0">
                      <svg className="size-2.5 text-white" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  ) : (
                    <div className="size-[18px] rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                      <svg className="size-2.5 text-gray-300" viewBox="0 0 12 12" fill="none">
                        <path d="M3 9l6-6M9 9L3 3" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
                      </svg>
                    </div>
                  )}
                  <span className={cn("text-sm", included ? "text-gray-700" : "text-gray-300")}>
                    {feature}
                  </span>
                </div>
              ))}
            </div>

            <div className="px-6 pb-6">
              <button
                disabled
                className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2.5 text-sm text-gray-400 cursor-not-allowed"
              >
                Free plan
              </button>
            </div>
          </div>

          {/* Pro */}
          <div className="rounded-xl border border-gray-900 bg-[#3f423f] overflow-hidden flex flex-col">
            <div className="px-6 py-5">
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">Pro</p>
              <div className="flex items-baseline gap-1.5 mt-3">
                <span className="text-4xl font-semibold text-white">$0.60</span>
                <span className="text-sm text-gray-500">/ month</span>
              </div>
              <p className="text-sm text-gray-500 mt-1">+ $0.30 per 1,000 characters</p>
            </div>

            <div className="h-px bg-white/10 mx-6" />

            <div className="px-6 py-5 space-y-3 flex-1">
              {proTier.map(({ feature }) => (
                <div key={feature} className="flex items-center gap-3">
                  <div className="size-[18px] rounded-full bg-white/10 flex items-center justify-center shrink-0">
                    <svg className="size-2.5 text-white" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <span className="text-sm text-gray-400">{feature}</span>
                </div>
              ))}
            </div>

            <div className="px-6 pb-6">
              {isActive ? (
                <button
                  disabled
                  className="w-full rounded-lg border border-white/10 bg-white/5 py-2.5 text-sm font-medium text-white cursor-default"
                >
                  ✓ Current plan
                </button>
              ) : (
                <button className="w-full rounded-lg bg-white py-2.5 text-sm font-medium text-gray-900 hover:bg-gray-100 transition-colors">
                  Upgrade to Pro
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Usage breakdown — only if subscribed */}
        {isActive && (
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-900">Usage Breakdown</p>
              <p className="text-xs text-gray-400 mt-0.5">Current billing period</p>
            </div>
            <div className="divide-y divide-gray-50">
              {[
                { label: "Base subscription", amount: "$0.60", note: "Monthly flat fee" },
                { label: "Characters used", amount: fmt(totalChars), note: `$${(totalChars * COST_PER_UNIT).toFixed(4)} at $0.30/1k` },
                { label: "Generations made", amount: fmt(genCount), note: "Total this period" },
                { label: "Estimated total", amount: `$${estimatedCost.toFixed(2)}`, note: "Sandbox · not charged", bold: true },
              ].map(({ label, amount, note, bold }) => (
                <div key={label} className="flex items-center justify-between px-6 py-4">
                  <div>
                    <p className={cn("text-sm", bold ? "font-semibold text-gray-900" : "text-gray-600")}>{label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{note}</p>
                  </div>
                  <p className={cn("text-sm font-semibold tabular-nums", bold ? "text-gray-900" : "text-gray-600")}>{amount}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };
  // ── MAIN ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50/50">

      {/* Top nav */}
      <div className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="px-6 sm:px-8 h-14 flex items-center justify-between gap-4">

          {/* Breadcrumb */}
          <div className="hidden sm:flex items-center gap-2 text-sm">
            <span className="text-gray-400">Dashboard</span>
            <span className="text-gray-300">/</span>
            <span className="text-gray-900 font-medium">Overview</span>
          </div>

          {/* Search */}
          <div className="hidden sm:flex flex-1 max-w-xs">
            <div className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 text-xs text-gray-400">
              <svg className="size-3.5 shrink-0" viewBox="0 0 16 16" fill="none">
                <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M10.5 10.5L13 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              Search generations...
              <span className="ml-auto text-[10px] border border-gray-200 rounded px-1 py-0.5 text-gray-300">⌘K</span>
            </div>
          </div>

          {/* Right */}
          <div className="flex items-center gap-2">
            {/* Bell with notifications dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(v => !v)}
                className="relative size-8 flex items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
              >
                <Bell className="size-4 text-gray-500" strokeWidth={1.75} />
                {recentNotifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 size-4 rounded-full bg-gray-900 text-white text-[9px] font-bold flex items-center justify-center">
                    {Math.min(recentNotifications.length, 9)}
                  </span>
                )}
              </button>

              {/* Notifications dropdown */}
              {showNotifications && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-900">Recent Activity</p>
                    <button onClick={() => setShowNotifications(false)}>
                      <Close className="size-4 text-gray-400 hover:text-gray-600" />
                    </button>
                  </div>
                  <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
                    {recentNotifications.length > 0 ? recentNotifications.map(g => (
                      <Link
                        key={g.id}
                        href={`/text-to-speech/${g.id}`}
                        onClick={() => setShowNotifications(false)}
                        className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                      >
                        <div className="size-7 rounded-full bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                          <AudioLines className="size-3.5 text-gray-500" strokeWidth={1.75} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800">
                            {g.voiceName ?? "Unknown"} generated
                          </p>
                          <p className="text-xs text-gray-400 truncate mt-0.5">
                            {g.text?.slice(0, 45)}{(g.text?.length ?? 0) > 45 ? "..." : ""}
                          </p>
                          <p className="text-xs text-gray-300 mt-1">{timeAgo(g.createdAt)}</p>
                        </div>
                      </Link>
                    )) : (
                      <div className="px-4 py-6 text-center">
                        <p className="text-sm text-gray-400">No recent activity</p>
                      </div>
                    )}
                  </div>
                  <div className="px-4 py-3 border-t border-gray-100">
                    <Link
                      href="/text-to-speech"
                      onClick={() => setShowNotifications(false)}
                      className="text-xs font-medium text-gray-500 hover:text-gray-900 flex items-center gap-1"
                    >
                      View all generations <ChevronRight className="size-3" />
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <div className="hidden sm:block w-px h-5 bg-gray-200" />

            <Link
              href="/text-to-speech"
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-medium hover:bg-gray-800 transition-all"
            >
              <Plus className="size-3.5" />
              New Generation
            </Link>

            <button
              className="sm:hidden size-8 flex items-center justify-center rounded-lg border border-gray-200"
              onClick={() => setMobileMenuOpen(v => !v)}
            >
              {mobileMenuOpen ? <X className="size-4 text-gray-500" /> : <Menu className="size-4 text-gray-500" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="sm:hidden px-4 pb-3 flex flex-col gap-2 border-t border-gray-100">
            <Link href="/text-to-speech" className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-gray-900 text-white text-sm">
              <Plus className="size-4" /> New Generation
            </Link>
          </div>
        )}

        {/* Tabs */}
        <div className="px-6 sm:px-8 flex items-center justify-between border-t border-gray-100">
          <div className="flex">
            {(["Overview", "Billing"] as const).map(t => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={cn(
                  "px-4 py-3 text-sm font-medium border-b-2 transition-all",
                  activeTab === t ? "text-gray-900 border-gray-900" : "text-gray-400 border-transparent hover:text-gray-600"
                )}
              >
                {t}
              </button>
            ))}
            <Link href="/voices" className="px-4 py-3 text-sm font-medium text-gray-400 border-b-2 border-transparent hover:text-gray-600 transition-all">
              Voices
            </Link>
            <Link href="/text-to-speech" className="px-4 py-3 text-sm font-medium text-gray-400 border-b-2 border-transparent hover:text-gray-600 transition-all">
              Generations
            </Link>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowPeriodMenu(p => !p)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 text-xs font-medium hover:bg-gray-50 transition-all"
            >
              Last 30 Days
              <svg className="size-3 text-gray-400" viewBox="0 0 12 12" fill="none">
                <path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            {showPeriodMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-sm py-1 z-50 min-w-[140px]">
                {["This Week", "Last Week", "This Month"].map(p => (
                  <button
                    key={p}
                    onClick={() => { setShowPeriodMenu(false); }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors text-gray-500"
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 sm:px-8 py-6 max-w-7xl space-y-5">

        {activeTab === "Billing" && <BillingView />}

        {activeTab === "Overview" && (
          <>
            {/* Page title */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Overview</h2>
              <p className="text-sm text-gray-400 mt-0.5">Your voice generation metrics and recent activity.</p>
            </div>

            {/* 4 stat cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                {
                  label: "Total Generations",
                  value: fmt(genCount),
                  delta: periodDelta,
                  sub: "vs last month",
                  icon: <Hash className="size-4 text-gray-300" strokeWidth={1.5} />,
                },
                {
                  label: "Characters Used",
                  value: fmt(totalChars),
                  delta: 8,
                  sub: "vs last month",
                  icon: <AudioLines className="size-4 text-gray-300" strokeWidth={1.5} />,
                },
                {
                  label: "Avg Length (chars)",
                  value: fmt(avgChars),
                  delta: 0,
                  sub: "vs last week",
                  icon: <Clock className="size-4 text-gray-300" strokeWidth={1.5} />,
                },
                {
                  label: "Voices Available",
                  value: `${systemVoices + customVoices}`,
                  delta: customVoices,
                  sub: `+${customVoices} new added`,
                  icon: <Mic2 className="size-4 text-gray-300" strokeWidth={1.5} />,
                },
              ].map((s) => (
                <div key={s.label} className="border border-gray-200 rounded-xl p-5 bg-white">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs text-gray-400 font-medium leading-tight">{s.label}</p>
                    {s.icon}
                  </div>
                  <p className="text-[28px] font-semibold text-gray-900 tabular-nums tracking-tight leading-none">{s.value}</p>
                  <div className="flex items-center gap-1 mt-2">
                    {s.delta > 0
                      ? <TrendingUp className="size-3 text-emerald-500" />
                      : s.delta < 0
                      ? <TrendingDown className="size-3 text-red-400" />
                      : null
                    }
                    <p className={cn(
                      "text-xs font-medium",
                      s.delta > 0 ? "text-emerald-500" : s.delta < 0 ? "text-red-400" : "text-gray-400"
                    )}>
                      {s.delta > 0 ? `+${s.delta}%` : s.delta < 0 ? `${s.delta}%` : "—"} {s.sub}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Chart — 70% width, aligned left */}
            <div className="grid grid-cols-1 lg:grid-cols-[70%_30%] gap-5 items-start">
              <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Generation Performance</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {chartPeriod === "Daily" ? "Last 7 days" : chartPeriod === "Weekly" ? "Last 14 days" : "Last 30 days"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                    {["Daily", "Weekly", "Monthly"].map(p => (
                      <button
                        key={p}
                        onClick={() => setChartPeriod(p)}
                        className={cn(
                          "px-3 py-1 rounded-md text-xs font-medium transition-all",
                          chartPeriod === p ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                        )}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="px-4 pt-4 pb-2" style={{ height: 260 }}>
                  {chartHasActivity ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 6" stroke="#f3f4f6" vertical={false} />
                        <XAxis
                          dataKey="label"
                          tick={{ fontSize: 11, fill: "#9ca3af" }}
                          tickLine={false}
                          axisLine={{ stroke: "#f3f4f6" }}
                          interval={Math.floor(days / 5)}
                          padding={{ left: 10, right: 10 }}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: "#9ca3af" }}
                          tickLine={false}
                          axisLine={false}
                          allowDecimals={false}
                          width={32}
                          tickFormatter={(v) => v === 0 ? "0" : fmt(v)}
                        />
                        <Tooltip
                          contentStyle={tooltipStyle}
                          cursor={{ stroke: "#e5e7eb", strokeWidth: 1 }}
                          formatter={(v: any, name: string) => [v, name === "thisWeek" ? "This period" : "Previous"]}
                        />
                        <Line
                          type="monotone"
                          dataKey="lastWeek"
                          name="Previous"
                          stroke="#e5e7eb"
                          strokeWidth={1.5}
                          strokeDasharray="4 4"
                          dot={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="thisWeek"
                          name="This period"
                          stroke="#111827"
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 4, fill: "#111827", stroke: "#fff", strokeWidth: 2 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center gap-2 border border-dashed border-gray-200 rounded-xl">
                      <p className="text-sm text-gray-400">No activity this period</p>
                      <Link href="/text-to-speech" className="text-xs font-medium text-gray-900 underline underline-offset-2">
                        Create your first generation
                      </Link>
                    </div>
                  )}
                </div>
              </div>

              {/* Top Voices — right side, aligned with chart */}
              <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-900">Top Voices Used</p>
                  <button className="text-gray-300 hover:text-gray-500 transition-colors">
                    <svg className="size-4" viewBox="0 0 16 16" fill="none">
                      <circle cx="4" cy="8" r="1.2" fill="currentColor"/>
                      <circle cx="8" cy="8" r="1.2" fill="currentColor"/>
                      <circle cx="12" cy="8" r="1.2" fill="currentColor"/>
                    </svg>
                  </button>
                </div>
                <div className="px-5 py-4 space-y-5">
                  {voiceBarData.length > 0 ? voiceBarData.map(({ name, pct, value, chars }) => (
                    <div key={name}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2.5">
                          {/* High quality mic icon */}
                          <div className="size-7 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
                            <svg className="size-3.5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="9" y="2" width="6" height="11" rx="3"/>
                              <path d="M5 10a7 7 0 0 0 14 0"/>
                              <line x1="12" y1="19" x2="12" y2="22"/>
                              <line x1="9" y1="22" x2="15" y2="22"/>
                            </svg>
                          </div>
                          <p className="text-sm font-medium text-gray-800">{name}</p>
                        </div>
                        <p className="text-sm font-semibold text-gray-500 tabular-nums">{pct}%</p>
                      </div>
                      <p className="text-xs text-gray-400 mb-2 ml-9">{value} uses · {fmt(chars)} chars</p>
                      {/* Thick progress bar — 5x thicker */}
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden ml-9">
                        <div
                          className="h-full rounded-full bg-gray-800 transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )) : (
                    <p className="text-sm text-gray-400 text-center py-6">Generate to see voice usage</p>
                  )}
                </div>
                <div className="px-5 pb-4">
                  <Link href="/voices" className="text-xs text-gray-400 hover:text-gray-900 transition-colors flex items-center gap-1">
                    View All Voices <ChevronRight className="size-3" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Recent Generations + Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5">

              {/* Recent Generations — table */}
              <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-900">Recent Generations</p>
                  <Link href="/text-to-speech" className="text-xs text-gray-400 hover:text-gray-900 transition-colors flex items-center gap-1">
                    View All <ChevronRight className="size-3" />
                  </Link>
                </div>

                {/* Table header */}
                <div className="grid grid-cols-[32px_1fr_90px_70px_80px] gap-3 px-6 py-2.5 border-b border-gray-50">
                  <div />
                  <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Text Preview</p>
                  <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Voice</p>
                  <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Chars</p>
                  <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider text-right">Time</p>
                </div>

                {generations && generations.length > 0 ? (
                  <div className="divide-y divide-gray-50">
                    {generations.slice(0, 6).map(g => (
                      <Link
                        key={g.id}
                        href={`/text-to-speech/${g.id}`}
                        className="grid grid-cols-[32px_1fr_90px_70px_80px] gap-3 items-center px-6 py-3.5 hover:bg-gray-50 transition-colors group"
                      >
                        <div className="size-7 rounded-full border border-gray-200 flex items-center justify-center group-hover:border-gray-400 transition-colors shrink-0">
                          <Play className="size-2.5 text-gray-500 fill-gray-500 ml-0.5" />
                        </div>
                        <p className="text-sm text-gray-600 truncate">
                          "{g.text?.slice(0, 38)}{(g.text?.length ?? 0) > 38 ? "..." : ""}"
                        </p>
                        <p className="text-sm text-gray-500 truncate">{g.voiceName ?? "—"}</p>
                        <p className="text-sm text-gray-400 tabular-nums">{g.text?.length ?? 0}</p>
                        <p className="text-sm text-gray-400 tabular-nums text-right">{timeAgo(g.createdAt)}</p>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-14 gap-2">
                    <p className="text-sm text-gray-400">No generations yet</p>
                    <Link href="/text-to-speech" className="text-xs font-medium text-gray-900 underline underline-offset-2">
                      Start generating
                    </Link>
                  </div>
                )}
              </div>

              {/* Quick Actions — 2x2 working grid */}
              <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                <div className="px-5 py-4 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-900">Quick Actions</p>
                </div>
                <div className="grid grid-cols-2 gap-px bg-gray-100">
                  {[
                    {
                      title: "Text to Speech",
                      icon: (
                        <svg className="size-5 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 5L6 9H2v6h4l5 4V5z"/>
                          <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
                          <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                        </svg>
                      ),
                      href: "/text-to-speech",
                    },
                    {
                      title: "Clone Voice",
                      icon: (
                        <svg className="size-5 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="9" y="2" width="6" height="11" rx="3"/>
                          <path d="M5 10a7 7 0 0 0 14 0"/>
                          <line x1="12" y1="19" x2="12" y2="22"/>
                          <line x1="9" y1="22" x2="15" y2="22"/>
                        </svg>
                      ),
                      href: "#",
                      onClick: () => {},
                    },
                    {
                      title: "Voice Library",
                      icon: (
                        <svg className="size-5 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 18V5l12-2v13"/>
                          <circle cx="6" cy="18" r="3"/>
                          <circle cx="18" cy="16" r="3"/>
                        </svg>
                      ),
                      href: "/voices",
                    },
                    {
                      title: "Settings",
                      icon: (
                        <svg className="size-5 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="3"/>
                          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                        </svg>
                      ),
                      href: "#",
                    },
                  ].map(a => (
                    <Link
                      key={a.title}
                      href={a.href}
                      className="flex flex-col items-center justify-center gap-2.5 py-6 bg-white hover:bg-gray-50 transition-colors"
                    >
                      {a.icon}
                      <span className="text-xs font-medium text-gray-600 text-center leading-tight px-2">{a.title}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}