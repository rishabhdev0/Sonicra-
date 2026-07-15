import type { Metadata } from "next";
import { TextToSpeechView } from "@/features/text-to-speech/views/text-to-speech-view";
import { trpc, HydrateClient, prefetch } from "@/trpc/server";

export const metadata: Metadata = { title: "Text to Speech" };

export default async function TextToSpeechPage({
  searchParams,
}: {
  searchParams: Promise<{ text?: string; voiceId?: string; temperature?: string }>;
}) {
  const { text, voiceId, temperature } = await searchParams;
  const parsedTemperature = Number(temperature);
  const safeTemperature =
    Number.isFinite(parsedTemperature) && parsedTemperature >= 0 && parsedTemperature <= 2
      ? parsedTemperature
      : undefined;

  prefetch(trpc.voices.getAll.queryOptions());
  prefetch(trpc.generations.getAll.queryOptions());

  return (
    <HydrateClient>
      <TextToSpeechView
        initialValues={{
          text,
          voiceId,
          temperature: safeTemperature,
        }}
      />
    </HydrateClient>
  );
};

