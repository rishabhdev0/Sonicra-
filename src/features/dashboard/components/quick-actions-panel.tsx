import { quickActions } from "@/features/dashboard/data/quick-actions";
import { QuickActionCard } from "@/features/dashboard/components/quick-action-card";

export function QuickActionsPanel() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Quick actions
        </h2>
        <div className="h-px flex-1 bg-border/50 ml-4" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {quickActions.map((action) => (
          <QuickActionCard
            key={action.title}
            title={action.title}
            description={action.description}
            gradient={action.gradient}
            href={action.href}
          />
        ))}
      </div>
    </div>
  );
}