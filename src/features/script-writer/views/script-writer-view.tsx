"use client";

import { useState } from "react";
import { 
  Mic, FileText, Megaphone, Youtube, Lightbulb, 
  BookOpen, Newspaper, Copy, Check, AudioLines, 
  Loader2, Sparkles, Clock
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { SCRIPT_FORMATS } from "../data/formats";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// Map format IDs to proper Lucide icons
const FORMAT_ICONS: Record<string, React.ReactNode> = {
  "podcast-intro": <Mic className="size-5 text-indigo-600" strokeWidth={1.75} />,
  "ad-15": <Megaphone className="size-5 text-rose-600" strokeWidth={1.75} />,
  "ad-30": <Megaphone className="size-5 text-orange-600" strokeWidth={1.75} />,
  "ad-60": <Megaphone className="size-5 text-amber-600" strokeWidth={1.75} />,
  "youtube-intro": <Youtube className="size-5 text-red-600" strokeWidth={1.75} />,
  "explainer": <Lightbulb className="size-5 text-yellow-600" strokeWidth={1.75} />,
  "audiobook-chapter": <BookOpen className="size-5 text-emerald-600" strokeWidth={1.75} />,
  "news-report": <Newspaper className="size-5 text-slate-600" strokeWidth={1.75} />,
};

export function ScriptWriterView() {
  const router = useRouter();
 const [selectedFormat, setSelectedFormat] = useState<string>(
  SCRIPT_FORMATS[0].id
);
  const [details, setDetails] = useState("");
  const [script, setScript] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const format = SCRIPT_FORMATS.find((f) => f.id === selectedFormat)!;

  const generateScript = async () => {
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
        body: JSON.stringify({
          format: selectedFormat,
          details: details.trim(),
        }),
      });
      if (!response.ok) throw new Error("Failed to generate script");
      const data = await response.json();
      setScript(data.script);
    } catch {
      toast.error("Failed to generate script. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyScript = () => {
    navigator.clipboard.writeText(script);
    setCopied(true);
    toast.success("Script copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  // ✅ Fixed: use sessionStorage instead of URL params
  const useInTTS = () => {
    sessionStorage.setItem("tts-prefill", script);
    router.push("/text-to-speech");
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-auto bg-slate-50/50">
      <div className="px-6 py-8 max-w-4xl mx-auto w-full space-y-8">

        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="size-11 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
            <Sparkles className="size-5 text-indigo-600" strokeWidth={1.75} />
          </div>
          <div>
            <h1 className="text-[20px] font-bold text-slate-900 tracking-tight">
              AI Script Writer
            </h1>
            <p className="text-[13px] text-slate-500 mt-0.5">
              Generate professional scripts instantly, then convert to speech in one click.
            </p>
          </div>
        </div>

        {/* Format Selector */}
        <div className="space-y-3">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-[0.12em]">
            Choose a format
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {SCRIPT_FORMATS.map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedFormat(f.id)}
                className={cn(
                  "rounded-xl border p-3.5 text-left transition-all group",
                  selectedFormat === f.id
                    ? "border-indigo-200 bg-indigo-50/80 shadow-sm"
                    : "border-slate-200 bg-white hover:border-indigo-100 hover:bg-slate-50/80"
                )}
              >
                <div className={cn(
                  "size-8 rounded-lg flex items-center justify-center mb-2.5",
                  selectedFormat === f.id ? "bg-white shadow-sm" : "bg-slate-50"
                )}>
                  {FORMAT_ICONS[f.id]}
                </div>
                <p className={cn(
                  "text-[12.5px] font-semibold leading-tight",
                  selectedFormat === f.id ? "text-indigo-700" : "text-slate-700"
                )}>
                  {f.label}
                </p>
                <p className="text-[10.5px] text-slate-400 mt-0.5 leading-snug">
                  {f.description}
                </p>
                <div className="flex items-center gap-1 mt-2">
                  <Clock className="size-3 text-slate-300" />
                  <span className="text-[10px] text-slate-400">{f.duration}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Input */}
        <div className="space-y-2">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-[0.12em]">
            Describe your {format.label.toLowerCase()}
          </p>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <Textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder={`Describe what you want to create. For example: A tech podcast called "Future Forward" hosted by two friends who discuss AI, startups and the future of work...`}
              className="border-0 shadow-none resize-none focus-visible:ring-0 text-[14px] leading-relaxed min-h-[120px] p-4 placeholder:text-slate-300"
            />
            <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
              <p className="text-[11px] text-slate-400">
                {details.length} characters
              </p>
              <Button
                onClick={generateScript}
                disabled={isGenerating || !details.trim()}
                size="sm"
                className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    Writing...
                  </>
                ) : (
                  <>
                    <Sparkles className="size-3.5" />
                    Generate Script
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Output */}
        {script && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-[0.12em]">
                Generated script
              </p>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <FileText className="size-3.5" />
                {script.length} chars
                <span className="text-slate-200 mx-1">·</span>
                ~${(script.length * 0.0003).toFixed(4)} to generate audio
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5">
                <p className="text-[14.5px] text-slate-800 leading-[1.8] tracking-tight whitespace-pre-wrap font-[450]">
                  {script}
                </p>
              </div>
              <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyScript}
                  className="gap-1.5 text-[12px]"
                >
                  {copied ? (
                    <Check className="size-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                  {copied ? "Copied!" : "Copy"}
                </Button>
                <Button
                  size="sm"
                  onClick={useInTTS}
                  className="gap-1.5 text-[12px] bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  <AudioLines className="size-3.5" />
                  Use in TTS
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}