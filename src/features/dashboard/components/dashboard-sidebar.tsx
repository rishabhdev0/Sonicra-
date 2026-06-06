"use client";

import { usePathname } from "next/navigation";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup,
  SidebarGroupContent, SidebarGroupLabel, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarRail, SidebarTrigger,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { OrganizationSwitcher, UserButton, useClerk } from "@clerk/nextjs";
import {
  type LucideIcon, Home, LayoutGrid, AudioLines, Volume2,
  Settings, Headphones, Zap, Wand2, Bell, Plus, X, ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { UsageContainer } from "@/features/billing/components/usage-container";
import { VoiceCreateDialog } from "@/features/voices/components/voice-create-dialog";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { cn } from "@/lib/utils";

function timeAgo(date: Date) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

interface MenuItem {
  title: string; url?: string; icon: LucideIcon; onClick?: () => void; badge?: string; badgeColor?: string;
}

function NavSection({ label, items, pathname }: { label?: string; items: MenuItem[]; pathname: string }) {
  return (
    <SidebarGroup>
      {label && (
        <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.14em] text-indigo-300 font-semibold px-3 mb-1">
          {label}
        </SidebarGroupLabel>
      )}
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild={!!item.url}
                isActive={item.url ? (item.url === "/" ? pathname === "/" : pathname.startsWith(item.url)) : false}
                onClick={item.onClick}
                tooltip={item.title}
                className="h-9 px-3 text-[13px] font-medium text-gray-500 hover:text-gray-800 hover:bg-slate-50 transition-all data-[active=true]:bg-indigo-50 data-[active=true]:text-indigo-700 data-[active=true]:font-semibold rounded-lg"
              >
                {item.url ? (
                  <Link href={item.url} className="flex items-center gap-2.5 w-full">
                    <item.icon className="size-4 shrink-0" strokeWidth={1.75} />
                    <span>{item.title}</span>
                    {item.badge && (
                      <span className={`ml-auto text-[9px] px-1.5 py-0.5 rounded-full font-bold ${item.badgeColor ?? "bg-indigo-100 text-indigo-600"}`}>
                        {item.badge}
                      </span>
                    )}
                  </Link>
                ) : (
                  <div className="flex items-center gap-2.5 w-full">
                    <item.icon className="size-4 shrink-0" strokeWidth={1.75} />
                    <span>{item.title}</span>
                    {item.badge && (
                      <span className={`ml-auto text-[9px] px-1.5 py-0.5 rounded-full font-bold ${item.badgeColor ?? "bg-indigo-100 text-indigo-600"}`}>
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function DashboardSidebar() {
  const pathname = usePathname();
  const clerk = useClerk();
  const [voiceDialogOpen, setVoiceDialogOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [lastReadCount, setLastReadCount] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    return parseInt(localStorage.getItem("sonicra_notif_read") ?? "0", 10);
  });
  const trpc = useTRPC();
  const { data: generations } = useQuery(trpc.generations.getAll.queryOptions());
  const recentNotifications = generations?.slice(0, 5) ?? [];
  const unreadCount = Math.max(0, recentNotifications.length - lastReadCount);

  function handleBell() {
    setShowNotifications(v => !v);
    if (!showNotifications) {
      const count = recentNotifications.length;
      setLastReadCount(count);
      localStorage.setItem("sonicra_notif_read", String(count));
    }
  }

  const mainItems: MenuItem[] = [
    { title: "Dashboard", url: "/", icon: Home },
    { title: "Text to Speech", url: "/text-to-speech", icon: AudioLines, badge: "New", badgeColor: "bg-blue-100 text-blue-600" },
    { title: "AI Script Writer", url: "/script-writer", icon: Wand2, badge: "New", badgeColor: "bg-purple-100 text-purple-600" },
    { title: "Voice Library", url: "/voices", icon: LayoutGrid },
    { title: "Clone Voice", icon: Volume2, onClick: () => setVoiceDialogOpen(true), badge: "Beta", badgeColor: "bg-green-100 text-green-600" },
  ];

  const accountItems: MenuItem[] = [
    { title: "Settings", icon: Settings, onClick: () => clerk.openOrganizationProfile() },
    { title: "Help & Support", url: "mailto:support@sonicra.app", icon: Headphones },
  ];

  return (
    <>
      <VoiceCreateDialog open={voiceDialogOpen} onOpenChange={setVoiceDialogOpen} />
      <Sidebar collapsible="icon">

        {/* ── Header ── */}
        <SidebarHeader className="flex flex-col gap-3 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5 pl-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:pl-0">
            <div className="size-7 rounded-lg bg-gradient-to-br from-indigo-600 to-indigo-400 flex items-center justify-center shrink-0 shadow-md shadow-indigo-200">
              <Zap className="size-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="group-data-[collapsible=icon]:hidden font-extrabold text-[15px] tracking-[0.05em] text-slate-800 dark:text-slate-100">
              SONIC<span className="text-indigo-600">RA</span>
            </span>

            {/* Bell — hidden when sidebar is icon-collapsed */}
            <div className="ml-auto relative group-data-[collapsible=icon]:hidden">
              <button
                onClick={handleBell}
                className="relative size-7 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors"
              >
                <Bell className="size-4 text-slate-400" strokeWidth={1.75} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 size-3.5 rounded-full bg-indigo-600 text-white text-[8px] font-bold flex items-center justify-center">
                    {Math.min(unreadCount, 9)}
                  </span>
                )}
              </button>

              {/* Notifications dropdown */}
              {showNotifications && (
                <div className="absolute left-0 top-full mt-2 w-72 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-900">Recent Activity</p>
                    <button onClick={() => setShowNotifications(false)}>
                      <X className="size-4 text-gray-400 hover:text-gray-600" />
                    </button>
                  </div>
                  <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
                    {recentNotifications.length > 0 ? recentNotifications.map(g => (
                      <Link
                        key={g.id}
                        href={`/text-to-speech/${g.id}`}
                        onClick={() => setShowNotifications(false)}
                        className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                      >
                        <div className="size-6 rounded-full bg-indigo-50 flex items-center justify-center shrink-0 mt-0.5">
                          <AudioLines className="size-3 text-indigo-500" strokeWidth={1.75} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-800">{g.voiceName ?? "Unknown"} generated</p>
                          <p className="text-[11px] text-gray-400 truncate mt-0.5">
                            {g.text?.slice(0, 40)}{(g.text?.length ?? 0) > 40 ? "..." : ""}
                          </p>
                          <p className="text-[11px] text-gray-300 mt-1">{timeAgo(g.createdAt)}</p>
                        </div>
                      </Link>
                    )) : (
                      <div className="px-4 py-6 text-center">
                        <p className="text-xs text-gray-400">No recent activity</p>
                      </div>
                    )}
                  </div>
                  <div className="px-4 py-2.5 border-t border-gray-100">
                    <Link
                      href="/text-to-speech"
                      onClick={() => setShowNotifications(false)}
                      className="text-[11px] font-medium text-gray-500 hover:text-gray-900 flex items-center gap-1"
                    >
                      View all <ChevronRight className="size-3" />
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <SidebarTrigger className="ml-auto lg:hidden group-data-[collapsible=icon]:ml-0" />
          </div>

          <SidebarMenu>
            <SidebarMenuItem>
              <OrganizationSwitcher
                hidePersonal
                fallback={<Skeleton className="h-8 w-full rounded-lg border bg-slate-50" />}
                appearance={{
                  elements: {
                    rootBox: "w-full! group-data-[collapsible=icon]:w-auto!",
                    organizationSwitcherTrigger: "w-full! justify-between! bg-slate-50! border! border-slate-200! rounded-lg! pl-2! pr-2! py-1.5! gap-2! text-slate-700!",
                    organizationPreviewAvatarBox: "size-5! rounded-sm!",
                    organizationPreviewMainIdentifier: "text-[12px]! font-semibold! text-slate-700!",
                    organizationSwitcherTriggerIcon: "size-3.5! text-slate-400!",
                  },
                }}
              />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        {/* ── Nav ── */}
        <SidebarContent className="pt-2 gap-0">
          <NavSection items={mainItems} pathname={pathname} />
          <NavSection label="Account" items={accountItems} pathname={pathname} />
        </SidebarContent>

        {/* ── Footer ── */}
        <SidebarFooter className="gap-3 py-3 border-t border-slate-100 dark:border-slate-800">

          {/* New Generation CTA */}
          <div className="px-2 group-data-[collapsible=icon]:px-0">
            <Link
              href="/text-to-speech"
              className="group-data-[collapsible=icon]:hidden flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[13px] font-semibold transition-colors shadow-sm shadow-indigo-200"
            >
              <Plus className="size-4" strokeWidth={2.5} />
              New Generation
            </Link>
            {/* Collapsed icon-only version */}
            <Link
              href="/text-to-speech"
              className="hidden group-data-[collapsible=icon]:flex items-center justify-center w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
            >
              <Plus className="size-4" strokeWidth={2.5} />
            </Link>
          </div>

          <UsageContainer />

          <SidebarMenu>
            <SidebarMenuItem>
              <UserButton
                showName
                fallback={<Skeleton className="h-8 w-full rounded-lg border bg-slate-50" />}
                appearance={{
                  elements: {
                    rootBox: "w-full! group-data-[collapsible=icon]:w-auto!",
                    userButtonTrigger: "w-full! justify-between! bg-slate-50! border! border-slate-200! rounded-lg! pl-2! pr-2! py-1.5! group-data-[collapsible=icon]:w-auto! group-data-[collapsible=icon]:p-1! group-data-[collapsible=icon]:after:hidden!",
                    userButtonBox: "flex-row-reverse! gap-2!",
                    userButtonOuterIdentifier: "text-[12px]! font-semibold! text-slate-700! group-data-[collapsible=icon]:hidden!",
                    userButtonAvatarBox: "size-5!",
                  },
                }}
              />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>
    </>
  );
}