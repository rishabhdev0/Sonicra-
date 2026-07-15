"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AudioLines,
  BookOpen,
  Check,
  Clock3,
  Copy,
  FileText,
  Lightbulb,
  Loader2,
  Megaphone,
  Mic,
  Newspaper,
  Sparkles,
  Youtube,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { SCRIPT_FORMATS } from "../data/formats";

const DETAILS_MAX_LENGTH = 4_000;

const FORMAT_ICONS: Record<string, React.ReactNode> = {
  "podcast-intro": <Mic className="size-4 text-primary" />,
  "ad-15": <Megaphone className="size-4 text-rose-600" />,
  "ad-30": <Megaphone className="size-4 text-orange-600" />,
  "ad-60": <Megaphone className="size-4 text-amber-600" />,
  "youtube-intro": <Youtube className="size-4 text-red-600" />,
  explainer: <Lightbulb className="size-4 text-amber-600" />,
  "audiobook-chapter": <BookOpen className="size-4 text-emerald-700" />,
  "news-report": <Newspaper className="size-4 text-sky-700" />,
};

export function ScriptWriterView() {
  const router = useRouter();
  const [selectedFormat, setSelectedFormat] = useState<
    (typeof SCRIPT_FORMATS)[number]["id"]
  >(SCRIPT_FORMATS[0].id);
  const [details, setDetails] = useState("");
  const [script, setScript] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const format = SCRIPT_FORMATS.find((item) => item.id === selectedFormat)!;

  async function generateScript() {
    if (!details.trim()) {
      toast.error("Please describe what you want to create");
      return;
    }

    setIsGenerating(true);
    setScript("");
    try {
      const response = await fetch("/api/script-writer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format: selectedFormat, details: details.trim() }),
      });
      if (!response.ok) throw new Error("Failed to generate script");
      const data = await response.json();
      setScript(data.script);
    } catch {
      toast.error("Failed to generate script. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  }

  function copyScript() {
    navigator.clipboard.writeText(script);
    setCopied(true);
    toast.success("Script copied");
    setTimeout(() => setCopied(false), 2000);
  }

  function useInTTS() {
    sessionStorage.setItem("tts-prefill", script);
    router.push("/text-to-speech");
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background">
      <PageHeader title="AI script writer" description="Build a production-ready script, then send it to speech" />

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto grid w-full max-w-[1280px] gap-5 p-4 lg:grid-cols-[280px_minmax(0,1fr)] lg:p-7">
          <aside className="h-fit overflow-hidden rounded-lg border bg-card lg:sticky lg:top-0">
            <div className="border-b px-4 py-4">
              <p className="text-[11px] font-semibold uppercase text-primary">Output format</p>
              <p className="mt-1 text-xs text-muted-foreground">Choose the structure and target length.</p>
            </div>
            <div className="divide-y p-1.5">
              {SCRIPT_FORMATS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedFormat(item.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors",
                    selectedFormat === item.id ? "bg-accent text-accent-foreground" : "hover:bg-muted/65",
                  )}
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-md border bg-card">
                    {FORMAT_ICONS[item.id]}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold">{item.label}</span>
                    <span className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Clock3 className="size-2.5" /> {item.duration}
                    </span>
                  </span>
                  {selectedFormat === item.id && <Check className="size-3.5 text-primary" />}
                </button>
              ))}
            </div>
          </aside>

          <main className="min-w-0 space-y-5">
            <section className="overflow-hidden rounded-lg border bg-card">
              <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="size-4 text-primary" />
                    <h1 className="text-sm font-semibold">Create a {format.label.toLowerCase()}</h1>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{format.description}</p>
                </div>
                <span className="hidden rounded bg-muted px-2 py-1 text-[10px] font-semibold text-muted-foreground sm:block">{format.duration}</span>
              </div>

              <div className="p-4 lg:p-5">
                <label htmlFor="script-details" className="mb-2 block text-[11px] font-semibold text-muted-foreground">
                  Creative brief
                </label>
                <Textarea
                  id="script-details"
                  value={details}
                  onChange={(event) => setDetails(event.target.value)}
                  placeholder={`Describe the audience, message, tone, and important details for this ${format.label.toLowerCase()}...`}
                  className="min-h-44 resize-none bg-background p-4 text-sm leading-6 shadow-none placeholder:text-muted-foreground/55"
                  maxLength={DETAILS_MAX_LENGTH}
                />
              </div>

              <div className="flex flex-col gap-3 border-t bg-background/55 px-4 py-3 sm:flex-row sm:items-center sm:justify-between lg:px-5">
                <p className="text-[11px] text-muted-foreground">{details.length.toLocaleString()} / {DETAILS_MAX_LENGTH.toLocaleString()} characters</p>
                <Button onClick={generateScript} disabled={isGenerating || !details.trim()} size="sm">
                  {isGenerating ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
                  {isGenerating ? "Writing script..." : "Generate script"}
                </Button>
              </div>
            </section>

            {script ? (
              <section className="overflow-hidden rounded-lg border bg-card">
                <div className="flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="size-4 text-primary" />
                    <div>
                      <h2 className="text-sm font-semibold">Generated script</h2>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">{script.length.toLocaleString()} chars · ~${(script.length * 0.0003).toFixed(4)} audio usage</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={copyScript} className="bg-card">
                      {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                      {copied ? "Copied" : "Copy"}
                    </Button>
                    <Button size="sm" onClick={useInTTS}>
                      <AudioLines className="size-3.5" />
                      Use in TTS
                    </Button>
                  </div>
                </div>
                <article className="whitespace-pre-wrap px-5 py-6 text-[14px] leading-7 text-foreground lg:px-7">
                  {script}
                </article>
              </section>
            ) : (
              <section className="flex min-h-48 items-center justify-center rounded-lg border border-dashed bg-card/55 p-6 text-center">
                <div>
                  <FileText className="mx-auto size-5 text-muted-foreground" />
                  <p className="mt-3 text-sm font-semibold">Your script will appear here</p>
                  <p className="mt-1 text-xs text-muted-foreground">Add a useful brief and generate when you are ready.</p>
                </div>
              </section>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
