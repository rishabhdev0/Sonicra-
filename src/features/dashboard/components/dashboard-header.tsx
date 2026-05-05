"use client";

import { useUser } from "@clerk/nextjs";
import { Headphones, ThumbsUp } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function DashboardHeader() {
  const { isLoaded, user } = useUser();

  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.14em]">
          Overview
        </p>
        <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">
          Hello,{" "}
          {isLoaded ? (
            <span className="text-primary">
              {user?.fullName ?? user?.firstName ?? "there"}
            </span>
          ) : (
            <span className="text-muted-foreground">...</span>
          )}
        </h1>
        <p className="text-sm text-muted-foreground pt-0.5">
          What are we generating today?
        </p>
      </div>

      <div className="lg:flex items-center gap-2 hidden">
        <Button
          variant="outline"
          size="sm"
          className="rounded-lg text-xs h-8 border-border/60 bg-card hover:bg-card/80 text-muted-foreground hover:text-foreground"
          asChild
        >
          <Link href="mailto:support@sonicra.app">
            <ThumbsUp className="size-3.5 mr-1.5" />
            Feedback
          </Link>
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="rounded-lg text-xs h-8 border-border/60 bg-card hover:bg-card/80 text-muted-foreground hover:text-foreground"
          asChild
        >
          <Link href="mailto:support@sonicra.app">
            <Headphones className="size-3.5 mr-1.5" />
            Need help?
          </Link>
        </Button>
      </div>
    </div>
  );
}