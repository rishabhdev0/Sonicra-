import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Toaster } from "@/components/ui/sonner";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/features/dashboard/components/dashboard-sidebar";

export default function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <NuqsAdapter>
      <SidebarProvider>
        <DashboardSidebar />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </SidebarProvider>
      <Toaster />
    </NuqsAdapter>
  );
}