import { Headphones, MessageSquareText } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  className,
}: {
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "sticky top-0 z-30 flex min-h-16 items-center justify-between border-b bg-background/92 px-4 backdrop-blur-xl lg:px-7",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <SidebarTrigger className="size-8 shrink-0 rounded-md border bg-card lg:hidden" />
        <div className="min-w-0">
          <h1 className="truncate text-[15px] font-semibold text-foreground">{title}</h1>
          {description && (
            <p className="hidden truncate text-xs text-muted-foreground sm:block">{description}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
         <Button variant="ghost" size="icon-sm" className="text-muted-foreground" asChild>
            <Link href="mailto:support@sonicra.app" title="Send feedback">
              <MessageSquareText />
              <span className="sr-only">Send feedback</span>
            </Link>
         </Button>
         <Button variant="outline" size="sm" className="h-8 gap-1.5 bg-card text-xs" asChild>
          <Link href="mailto:support@sonicra.app">
            <Headphones />
            <span className="hidden sm:block">Support</span>
          </Link>
        </Button>
      </div>
    </div>
  );
};
