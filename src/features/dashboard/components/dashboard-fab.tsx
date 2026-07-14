"use client";

import { useState } from "react";
import Link from "next/link";
import { AudioLines, Mic2, Plus, WandSparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { VoiceCreateDialog } from "@/features/voices/components/voice-create-dialog";

const actions = [
  { label: "New generation", href: "/text-to-speech", icon: AudioLines },
  { label: "Write a script", href: "/script-writer", icon: WandSparkles },
];

export function DashboardFab() {
  const [open, setOpen] = useState(false);
  const [voiceDialogOpen, setVoiceDialogOpen] = useState(false);

  return (
    <>
      <VoiceCreateDialog open={voiceDialogOpen} onOpenChange={setVoiceDialogOpen} />
      <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2 lg:bottom-7 lg:right-7">
        <div
          className={cn(
            "flex flex-col items-end gap-2 transition-all duration-200",
            open ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0",
          )}
        >
          {actions.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              onClick={() => setOpen(false)}
              className="flex h-10 items-center gap-2 rounded-lg border bg-popover px-3 text-xs font-semibold text-popover-foreground shadow-lg transition-transform hover:-translate-y-0.5"
            >
              <action.icon className="size-4 text-primary" />
              {action.label}
            </Link>
          ))}
          <button
            type="button"
            onClick={() => {
              setVoiceDialogOpen(true);
              setOpen(false);
            }}
            className="flex h-10 items-center gap-2 rounded-lg border bg-popover px-3 text-xs font-semibold text-popover-foreground shadow-lg transition-transform hover:-translate-y-0.5"
          >
            <Mic2 className="size-4 text-primary" />
            Clone a voice
          </button>
        </div>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-label={open ? "Close create menu" : "Open create menu"}
          className="flex size-13 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_12px_30px_-10px_color-mix(in_oklab,var(--primary)_75%,transparent)] transition-transform hover:scale-[1.04] active:scale-95"
        >
          {open ? <X className="size-5" /> : <Plus className="size-5" />}
        </button>
      </div>
    </>
  );
}
