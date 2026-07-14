import Link from "next/link";
import { AudioLines, BookOpen, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";

function AudioWaveAnimation() {
  return (
    <div className="flex items-end justify-center gap-[3px] h-8">
      {[0.4, 0.7, 1, 0.6, 0.9, 0.5, 0.8, 0.4, 0.7, 1, 0.6].map((height, i) => (
        <div
          key={i}
          className="w-[3px] rounded-full bg-foreground animate-pulse"
          style={{
            height: `${height * 100}%`,
            animationDelay: `${i * 80}ms`,
            animationDuration: "1000ms",
          }}
        />
      ))}
    </div>
  );
}

export function VoicePreviewPlaceholder({
  isGenerating = false,
}: {
  isGenerating?: boolean;
}) {
  if (isGenerating) {
    return (
      <div className="hidden h-full flex-1 flex-col items-center justify-center gap-6 border-t bg-background/40 lg:flex">
        <div className="flex flex-col items-center gap-5">
          {/* Waveform animation */}
          <div className="w-48 h-12 flex items-center justify-center">
            <AudioWaveAnimation />
          </div>

          {/* Text */}
          <div className="flex flex-col items-center gap-1.5">
            <p className="text-[15px] font-semibold tracking-tight text-foreground">
              Generating your audio
            </p>
            <p className="text-sm text-muted-foreground">
              This may take up to 60 seconds on first run
            </p>
          </div>

          {/* Progress dots */}
          <div className="flex items-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="size-1.5 rounded-full bg-muted-foreground/40 animate-pulse"
                style={{ animationDelay: `${i * 200}ms` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="hidden h-full flex-1 flex-col items-center justify-center gap-6 border-t bg-background/40 lg:flex">
      <div className="flex flex-col items-center gap-3">
        <div className="relative flex w-32 items-center justify-center">
          <div className="absolute left-0 -rotate-30 rounded-full bg-muted p-4">
            <Volume2 className="size-5 text-muted-foreground" />
          </div>
          <div className="relative z-10 rounded-full bg-foreground p-4">
            <AudioLines className="size-5 text-background" />
          </div>
          <div className="absolute right-0 -rotate-30 rounded-full bg-muted p-4">
            <AudioLines className="size-5 text-muted-foreground" />
          </div>
        </div>
        <p className="text-lg font-semibold tracking-tight text-foreground">
          Preview will appear here
        </p>
        <p className="max-w-64 text-center text-sm text-muted-foreground">
          Once you generate, your audio result will appear here. Sit back and relax.
        </p>
      </div>
      <Button variant="outline" size="sm" asChild>
        <Link href="mailto:support@sonicra.app">
          <BookOpen />
          Don&apos;t know how?
        </Link>
      </Button>
    </div>
  );
}
