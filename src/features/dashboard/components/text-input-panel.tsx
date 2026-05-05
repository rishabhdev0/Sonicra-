"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Coins } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import { 
  COST_PER_UNIT, 
  TEXT_MAX_LENGTH
} from "@/features/text-to-speech/data/constants";

export function TextInputPanel() {
  const [text, setText] = useState("");
  const router = useRouter();

  const handleGenerate = () => {
    const trimmed = text.trim();
    if (!trimmed) return;

    router.push(`/text-to-speech?text=${encodeURIComponent(trimmed)}`);
  };

  return (
    <div className="relative group mt-4">
      {/* Glow effect behind the card */}
      <div className="absolute -inset-1 rounded-[24px] bg-linear-to-r from-primary/30 via-secondary/30 to-blue-500/30 opacity-40 blur-xl transition duration-500 group-hover:opacity-60" />
      
      <div className="relative rounded-[22px] border border-white/40 dark:border-white/10 bg-white/60 dark:bg-black/40 backdrop-blur-xl p-2 shadow-2xl ring-1 ring-black/5 dark:ring-white/10 overflow-hidden">
        
        {/* Subtle inner noise/texture or top highlight if needed */}
        <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/50 to-transparent" />

        <div className="flex flex-col space-y-4 rounded-[18px] bg-white/80 dark:bg-black/60 p-5 md:p-6 transition-all duration-300">
          <Textarea
            placeholder="Start typing or paste your text here to generate lifelike speech..."
            className="min-h-40 resize-none font-medium text-lg border-0 bg-transparent p-0 shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/60 transition-colors"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={TEXT_MAX_LENGTH}
          />

          {/* Bottom info section */}
          <div className="flex items-center justify-between pt-3 border-t border-border/50">
            <Badge variant="secondary" className="gap-1.5 border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors rounded-full px-3 py-1 shadow-xs">
              <Coins className="size-3.5 text-primary" />
              <span className="text-xs font-semibold">
                {text.length === 0 ? (
                  "Type to estimate"
                ) : (
                  <>
                    <span className="tabular-nums">
                      ${(text.length * COST_PER_UNIT).toFixed(4)}
                    </span>{" "}
                    est. cost
                  </>
                )}
              </span>
            </Badge>
            <span className="text-xs font-medium text-muted-foreground">
              {text.length.toLocaleString()} <span className="hidden sm:inline">/ {TEXT_MAX_LENGTH.toLocaleString()} characters</span>
            </span>
          </div>
        </div>

        {/* Action bar */}
        <div className="flex items-center justify-end px-4 py-3 mt-1">
          <Button
            size="lg"
            disabled={!text.trim()}
            onClick={handleGenerate}
            className="w-full lg:w-auto rounded-full font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50 disabled:hover:translate-y-0"
          >
            Generate speech
          </Button>
        </div>
      </div>
    </div>
  )
}