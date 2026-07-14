import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Toaster } from "@/components/ui/sonner";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardFab } from "@/features/dashboard/components/dashboard-fab";
import { DashboardSidebar } from "@/features/dashboard/components/dashboard-sidebar";

export default function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <NuqsAdapter>
      <SidebarProvider
        style={{ "--sidebar-width": "16.5rem", "--sidebar-width-icon": "4.25rem" } as React.CSSProperties}
      >
        <DashboardSidebar />
        <main className="relative min-w-0 flex-1 overflow-auto bg-background">
          {children}
        </main>
        <DashboardFab />
      </SidebarProvider>
      <Toaster />
    </NuqsAdapter>
  );
}
