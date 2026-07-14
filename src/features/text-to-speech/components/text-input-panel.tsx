"use client";

import { Coins } from "lucide-react";
import { useStore } from "@tanstack/react-form";

import { SettingsDrawer } from "./settings-drawer";
import { HistoryDrawer } from "./history-drawer";
import { VoiceSelectorButton } from "./voice-selector-button";

import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useTypedAppFormContext } from "@/hooks/use-app-form";

import { 
  COST_PER_UNIT, 
  TEXT_MAX_LENGTH
} from "@/features/text-to-speech/data/constants";
import { ttsFormOptions } from "./text-to-speech-form";
import { GenerateButton } from "./generate-button";
import { PromptSuggestions } from "./prompt-suggestions";

export function TextInputPanel() {
  const form = useTypedAppFormContext(ttsFormOptions);

  const text = useStore(form.store, (s) => s.values.text);
  const isSubmitting = useStore(form.store, (s) => s.isSubmitting);
  const isValid = useStore(form.store, (s) => s.isValid);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-card">
      {/* Text input area */}
      <div className="relative min-h-0 flex-1">
        <div className="absolute inset-x-0 top-0 z-10 flex h-11 items-center justify-between border-b bg-card px-4 lg:px-6">
          <p className="text-[11px] font-semibold uppercase text-muted-foreground">Script</p>
          <p className="text-[11px] text-muted-foreground">Up to {TEXT_MAX_LENGTH.toLocaleString()} characters</p>
        </div>
        <form.Field name="text">
          {(field) => (
            <Textarea
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder="Start typing or paste your text here..."
              className="absolute inset-0 resize-none border-0 bg-transparent px-4 pb-6 pt-15 text-[15px]! leading-7 shadow-none wrap-break-word focus-visible:ring-0 lg:px-6 lg:pb-8 lg:pt-16"
              maxLength={TEXT_MAX_LENGTH}
              disabled={isSubmitting}
            />
          )}
        </form.Field>
        {/* Bottom fade overlay */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-linear-to-t from-background to-transparent" />
      </div>
      {/* Action bar */}
      <div className="shrink-0 border-t bg-background/55 p-4 lg:px-6 lg:py-4">
        {/* Mobile layout */}
        <div className="flex flex-col gap-3 lg:hidden">
          <div className="flex items-center gap-2">
            <SettingsDrawer>
              <VoiceSelectorButton />
            </SettingsDrawer>
            <HistoryDrawer />
          </div>
          <GenerateButton
            className="w-full"
            disabled={isSubmitting}
            isSubmitting={isSubmitting}
            onSubmit={() => form.handleSubmit()}
          />
        </div>
        {/* Desktop layout */}
        {text.length > 0 ? (
          <div className="hidden items-center justify-between lg:flex">
            <Badge variant="outline" className="gap-1.5 border-dashed">
              <Coins className="size-3 text-chart-5" />
              <span className="text-xs">
                <span className="tabular-nums">
                  ${(text.length * COST_PER_UNIT).toFixed(4)}
                </span>&nbsp;
                estimated
              </span>
            </Badge>
            <div className="flex items-center gap-3">
              <p className="text-xs">
                {text.length.toLocaleString()}
                <span className="text-muted-foreground">
                  &nbsp;/&nbsp;{TEXT_MAX_LENGTH.toLocaleString()} characters
                </span>
              </p>
              <GenerateButton
                size="sm"
                disabled={isSubmitting || !isValid}
                isSubmitting={isSubmitting}
                onSubmit={() => form.handleSubmit()}
              />
            </div>
          </div>
        ) : (
          <div className="hidden lg:block">
            <PromptSuggestions
              onSelect={(prompt) => form.setFieldValue("text", prompt)}
            />
          </div>
        )}
      </div>
    </div>
  );
};
