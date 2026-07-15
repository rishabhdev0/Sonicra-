import { Suspense } from "react";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Toaster } from "@/components/ui/sonner";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/features/dashboard/components/dashboard-sidebar";

export default function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <NuqsAdapter>
      <SidebarProvider
        style={{ "--sidebar-width": "16rem", "--sidebar-width-icon": "4rem" } as React.CSSProperties}
      >
        <Suspense fallback={<aside className="hidden h-svh w-64 shrink-0 border-r bg-white md:block" />}>
          <DashboardSidebar />
        </Suspense>
        <main className="relative min-w-0 flex-1 overflow-auto bg-background">
          {children}
        </main>
      </SidebarProvider>
      <Toaster />
    </NuqsAdapter>
  );
}
