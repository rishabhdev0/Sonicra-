import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { QuickAction } from "@/features/dashboard/data/quick-actions";
import { cn } from "@/lib/utils";

type QuickActionCardProps = QuickAction;

export function QuickActionCard({
  title,
  description,
  gradient,
  href,
}: QuickActionCardProps) {
  return (
    <Link href={href} className="group relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-2xl block">
      {/* Card outer glow on hover */}
      <div className={cn(
        "absolute -inset-0.5 rounded-2xl opacity-0 blur-lg transition duration-500 group-hover:opacity-40 bg-linear-to-br",
        gradient
      )} />
      
      <div className="relative flex h-full gap-4 rounded-2xl border border-white/40 dark:border-white/10 bg-white/70 dark:bg-card/60 backdrop-blur-md p-4 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] ring-1 ring-black/5 dark:ring-white/10 transition-all duration-300 group-hover:shadow-xl group-hover:-translate-y-1">
        {/* Visual placeholder with gradient */}
        <div
          className={cn(
            "relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-linear-to-br shadow-inner transition-transform duration-500 group-hover:scale-[1.02]",
            gradient,
          )}
        >
          {/* Decorative elements */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="size-8 rounded-full bg-white/30 backdrop-blur-xs shadow-[0_0_15px_rgba(255,255,255,0.4)] group-hover:scale-110 transition-transform duration-500 delay-75" />
          </div>
          <div className="absolute inset-1.5 rounded-lg border border-white/30 mix-blend-overlay group-hover:inset-1 transition-all duration-500" />
        </div>

        {/* Content */}
        <div className="flex flex-col justify-between py-1 flex-1">
          <div className="space-y-1.5">
            <h3 className="text-base font-semibold group-hover:text-primary transition-colors">{title}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
              {description}
            </p>
          </div>
          <div className="flex items-center text-xs font-semibold text-primary mt-2 translate-y-1 group-hover:translate-x-1 group-hover:translate-y-0 opacity-80 group-hover:opacity-100 transition-all duration-300">
            Get started
            <ArrowRight className="ml-1 size-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>
    </Link>
  );
}