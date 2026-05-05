"use client";

import { usePathname } from "next/navigation";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup,
  SidebarGroupContent, SidebarGroupLabel, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarRail, SidebarTrigger,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { OrganizationSwitcher, UserButton, useClerk } from "@clerk/nextjs";
import { type LucideIcon, Home, LayoutGrid, AudioLines, Volume2, Settings, Headphones, Zap } from "lucide-react";
import Link from "next/link";
import { UsageContainer } from "@/features/billing/components/usage-container";
import { VoiceCreateDialog } from "@/features/voices/components/voice-create-dialog";
import { useState } from "react";

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

  const mainItems: MenuItem[] = [
    { title: "Dashboard", url: "/", icon: Home },
    { title: "Text to Speech", url: "/text-to-speech", icon: AudioLines, badge: "New", badgeColor: "bg-blue-100 text-blue-600" },
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
        <SidebarHeader className="flex flex-col gap-3 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5 pl-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:pl-0">
            <div className="size-7 rounded-lg bg-gradient-to-br from-indigo-600 to-indigo-400 flex items-center justify-center shrink-0 shadow-md shadow-indigo-200">
              <Zap className="size-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="group-data-[collapsible=icon]:hidden font-extrabold text-[15px] tracking-[0.05em] text-slate-800 dark:text-slate-100">
              SONIC<span className="text-indigo-600">RA</span>
            </span>
            <SidebarTrigger className="ml-auto lg:hidden" />
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

        <SidebarContent className="pt-2 gap-0">
          <NavSection items={mainItems} pathname={pathname} />
          <NavSection label="Account" items={accountItems} pathname={pathname} />
        </SidebarContent>

        <SidebarFooter className="gap-3 py-3 border-t border-slate-100 dark:border-slate-800">
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