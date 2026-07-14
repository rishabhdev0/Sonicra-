"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { OrganizationSwitcher, UserButton, useClerk } from "@clerk/nextjs";
import {
  AudioLines,
  AudioWaveform,
  BookOpenText,
  ChartNoAxesCombined,
  CircleHelp,
  CreditCard,
  Library,
  PanelLeftClose,
  Settings,
  type LucideIcon,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { UsageContainer } from "@/features/billing/components/usage-container";

type NavItem = {
  title: string;
  icon: LucideIcon;
  href?: string;
  badge?: string;
  onClick?: () => void;
};

function NavigationGroup({
  label,
  items,
  pathname,
  billingView,
}: {
  label: string;
  items: NavItem[];
  pathname: string;
  billingView: boolean;
}) {
  return (
    <SidebarGroup className="px-2 py-2">
      <SidebarGroupLabel className="mb-1 px-2 text-[10px] font-semibold uppercase text-sidebar-foreground/45">
        {label}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu className="gap-1">
          {items.map((item) => {
            const isBilling = item.href === "/?view=billing";
            const isActive = item.href
              ? isBilling
                ? pathname === "/" && billingView
                : item.href === "/"
                  ? pathname === "/" && !billingView
                  : pathname.startsWith(item.href)
              : false;

            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild={Boolean(item.href)}
                  isActive={isActive}
                  tooltip={item.title}
                  onClick={item.onClick}
                  className="h-9 rounded-md px-2.5 text-[13px] font-medium text-sidebar-foreground/68 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground data-[active=true]:shadow-[inset_2px_0_0_var(--sidebar-primary)]"
                >
                  {item.href ? (
                    <Link href={item.href} className="flex w-full items-center gap-2.5">
                      <item.icon className="size-4 shrink-0" strokeWidth={1.8} />
                      <span>{item.title}</span>
                      {item.badge && (
                        <span className="ml-auto rounded bg-sidebar-primary/12 px-1.5 py-0.5 text-[9px] font-bold uppercase text-sidebar-primary">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  ) : (
                    <div className="flex w-full items-center gap-2.5">
                      <item.icon className="size-4 shrink-0" strokeWidth={1.8} />
                      <span>{item.title}</span>
                    </div>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function DashboardSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const clerk = useClerk();
  const billingView = searchParams.get("view") === "billing";

  const studioItems: NavItem[] = [
    { title: "Overview", href: "/", icon: ChartNoAxesCombined },
    { title: "Text to speech", href: "/text-to-speech", icon: AudioLines },
    { title: "Script writer", href: "/script-writer", icon: BookOpenText, badge: "AI" },
    { title: "Voice library", href: "/voices", icon: Library },
  ];

  const workspaceItems: NavItem[] = [
    { title: "Billing & usage", href: "/?view=billing", icon: CreditCard },
    { title: "Workspace settings", icon: Settings, onClick: () => clerk.openOrganizationProfile() },
    { title: "Help center", href: "mailto:support@sonicra.app", icon: CircleHelp },
  ];

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="gap-3 border-b border-sidebar-border px-3 pb-3 pt-4">
        <div className="flex h-9 items-center gap-2.5 px-1 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            <AudioWaveform className="size-4.5" strokeWidth={2.2} />
          </div>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="text-[14px] font-bold leading-none text-white">Sonicra</p>
            <p className="mt-1 text-[10px] font-medium text-sidebar-foreground/45">Voice operations</p>
          </div>
          <SidebarTrigger className="ml-auto size-7 text-sidebar-foreground/45 hover:bg-sidebar-accent hover:text-white group-data-[collapsible=icon]:hidden">
            <PanelLeftClose className="size-4" />
          </SidebarTrigger>
        </div>

        <SidebarMenu>
          <SidebarMenuItem>
            <OrganizationSwitcher
              hidePersonal
              fallback={<Skeleton className="h-9 w-full bg-white/8" />}
              appearance={{
                elements: {
                  rootBox: "w-full! group-data-[collapsible=icon]:w-auto!",
                  organizationSwitcherTrigger: "w-full! h-9! justify-between! rounded-md! border! border-white/8! bg-white/5! px-2! text-sidebar-foreground! hover:bg-white/8!",
                  organizationPreviewAvatarBox: "size-5! rounded-sm!",
                  organizationPreviewMainIdentifier: "text-[11px]! font-semibold! text-sidebar-foreground!",
                  organizationSwitcherTriggerIcon: "size-3.5! text-sidebar-foreground/45!",
                },
              }}
            />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="gap-0 py-1">
        <NavigationGroup label="Studio" items={studioItems} pathname={pathname} billingView={billingView} />
        <NavigationGroup label="Workspace" items={workspaceItems} pathname={pathname} billingView={billingView} />
      </SidebarContent>

      <SidebarFooter className="gap-3 border-t border-sidebar-border p-3">
        <UsageContainer />
        <SidebarMenu>
          <SidebarMenuItem>
            <UserButton
              showName
              fallback={<Skeleton className="h-9 w-full bg-white/8" />}
              appearance={{
                elements: {
                  rootBox: "w-full! group-data-[collapsible=icon]:w-auto!",
                  userButtonTrigger: "w-full! h-9! justify-between! rounded-md! border! border-white/8! bg-white/5! px-2! group-data-[collapsible=icon]:w-9! group-data-[collapsible=icon]:p-1!",
                  userButtonBox: "flex-row-reverse! gap-2!",
                  userButtonOuterIdentifier: "text-[11px]! font-semibold! text-sidebar-foreground! group-data-[collapsible=icon]:hidden!",
                  userButtonAvatarBox: "size-6!",
                },
              }}
            />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
