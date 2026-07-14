import { PageHeader } from "@/components/page-header";

export function VoicesLayout({ 
  children
}: { 
  children: React.ReactNode
}) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background">
      <PageHeader title="Voice library" description="Browse, preview, and manage workspace voices" />
      {children}
    </div>
  );
}
