"use client";
import { useEffect } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useStore } from "@tanstack/react-form";
import { useTRPC } from "@/trpc/client";
import { TextInputPanel } from "@/features/text-to-speech/components/text-input-panel";
import { VoicePreviewPlaceholder } from "@/features/text-to-speech/components/voice-preview-placeholder";
import { SettingsPanel } from "@/features/text-to-speech/components/settings-panel";
import {
  TextToSpeechForm,
  defaultTTSValues,
  ttsFormOptions,
  type TTSFormValues
} from "@/features/text-to-speech/components/text-to-speech-form";
import { TTSVoicesProvider } from "../contexts/tts-voices-context";
import { useTypedAppFormContext } from "@/hooks/use-app-form";

function GeneratingPlaceholder() {
  const form = useTypedAppFormContext(ttsFormOptions);
  const isSubmitting = useStore(form.store, (s) => s.isSubmitting);
  return <VoicePreviewPlaceholder isGenerating={isSubmitting} />;
}

export function TextToSpeechView({
  initialValues,
}: {
  initialValues?: Partial<TTSFormValues>;
}) {
  const trpc = useTRPC();
  const { data: voices } = useSuspenseQuery(trpc.voices.getAll.queryOptions());

  useEffect(() => {
    fetch(process.env.NEXT_PUBLIC_CHATTERBOX_API_URL + "/health", {
      method: "GET",
    }).catch(() => {});
  }, []);

  const { custom: customVoices, system: systemVoices } = voices;
  const allVoices = [...customVoices, ...systemVoices];
  const fallbackVoiceId = allVoices[0]?.id ?? "";

  const resolvedVoiceId =
    initialValues?.voiceId &&
    allVoices.some((v) => v.id === initialValues.voiceId)
      ? initialValues.voiceId
      : fallbackVoiceId;

  const defaultValues: TTSFormValues = {
    ...defaultTTSValues,
    ...initialValues,
    voiceId: resolvedVoiceId,
  };

  return (
    <TTSVoicesProvider value={{ customVoices, systemVoices, allVoices }}>
      <TextToSpeechForm defaultValues={defaultValues}>
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <div className="flex min-h-0 flex-1 flex-col">
            <TextInputPanel />
            <GeneratingPlaceholder />
          </div>
          <SettingsPanel />
        </div>
      </TextToSpeechForm>
    </TTSVoicesProvider>
  );
}