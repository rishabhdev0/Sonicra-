"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { OrganizationSwitcher, useClerk } from "@clerk/nextjs";
import {
  AudioLines,
  AudioWaveform,
  CircleHelp,
  CreditCard,
  FileText,
  House,
  Mic2,
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
  onClick?: () => void;
};

function Navigation({
  items,
  pathname,
  billingView,
}: {
  items: NavItem[];
  pathname: string;
  billingView: boolean;
}) {
  return (
    <SidebarMenu className="gap-1.5">
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
              className="h-11 rounded-lg px-3 text-[13px] font-medium text-sidebar-foreground/78 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:font-semibold data-[active=true]:text-sidebar-accent-foreground"
            >
              {item.href ? (
                <Link href={item.href} className="flex w-full items-center gap-3">
                  <item.icon className="size-[18px] shrink-0" strokeWidth={1.8} />
                  <span>{item.title}</span>
                </Link>
              ) : (
                <div className="flex w-full items-center gap-3">
                  <item.icon className="size-[18px] shrink-0" strokeWidth={1.8} />
                  <span>{item.title}</span>
                </div>
              )}
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}

export function DashboardSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const clerk = useClerk();
  const billingView = searchParams.get("view") === "billing";

  const primaryItems: NavItem[] = [
    { title: "Dashboard", href: "/", icon: House },
    { title: "Generate voice", href: "/text-to-speech", icon: Mic2 },
    { title: "Voice library", href: "/voices", icon: AudioLines },
    { title: "Script writer", href: "/script-writer", icon: FileText },
  ];

  const secondaryItems: NavItem[] = [
    { title: "Billing & usage", href: "/?view=billing", icon: CreditCard },
    { title: "Workspace settings", icon: Settings, onClick: () => clerk.openOrganizationProfile() },
    { title: "Help center", href: "mailto:support@sonicra.app", icon: CircleHelp },
  ];

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="gap-4 px-4 pb-4 pt-6">
        <div className="flex h-12 items-center gap-3 px-1 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[0_8px_22px_rgba(109,93,252,0.24)]">
            <AudioWaveform className="size-5" strokeWidth={2.2} />
          </div>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="text-[20px] font-bold leading-none text-sidebar-foreground">Sonicra</p>
            <p className="mt-1.5 text-[10px] font-medium text-muted-foreground">AI voice generation</p>
          </div>
          <SidebarTrigger className="ml-auto size-8 text-muted-foreground hover:bg-sidebar-accent hover:text-primary group-data-[collapsible=icon]:hidden">
            <PanelLeftClose className="size-4" />
          </SidebarTrigger>
        </div>

        <OrganizationSwitcher
          hidePersonal
          fallback={<Skeleton className="h-9 w-full" />}
          appearance={{
            elements: {
              rootBox: "w-full! group-data-[collapsible=icon]:w-auto!",
              organizationSwitcherTrigger: "w-full! h-9! justify-between! rounded-lg! border! border-sidebar-border! bg-white! px-2.5! text-sidebar-foreground! shadow-none! hover:bg-sidebar-accent!",
              organizationPreviewAvatarBox: "size-5! rounded-md!",
              organizationPreviewMainIdentifier: "text-[11px]! font-semibold! text-sidebar-foreground!",
              organizationSwitcherTriggerIcon: "size-3.5! text-muted-foreground!",
            },
          }}
        />
      </SidebarHeader>

      <SidebarContent className="gap-4 px-3 py-2">
        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <Navigation items={primaryItems} pathname={pathname} billingView={billingView} />
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mx-3 border-t border-sidebar-border" />

        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <Navigation items={secondaryItems} pathname={pathname} billingView={billingView} />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="gap-3 p-4 pt-2">
        <UsageContainer />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
