import { DashboardView } from "@/features/dashboard/views/dashboard-view";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  return <DashboardView billingView={view === "billing"} />;
}
