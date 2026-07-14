"use client";

import { useTRPC } from "@/trpc/client";
import { useQueryState } from "nuqs";
import { useSuspenseQuery } from "@tanstack/react-query";

import { VoicesList } from "../components/voices-list";
import { voicesSearchParams } from "../lib/params";
import { VoicesToolbar } from "../components/voices-toolbar";

function VoicesContent() {
  const trpc = useTRPC();
  const [query] = useQueryState(
    "query",
    voicesSearchParams.query
  );
  const { data } = useSuspenseQuery(
    trpc.voices.getAll.queryOptions({ query })
  );

  return (
    <>
      <VoicesList title="Team Voices" voices={data.custom} />
      <VoicesList title="Built-in Voices" voices={data.system} />
    </>
  );
};

export function VoicesView() {
  return (
    <div className="mx-auto w-full max-w-[1480px] flex-1 space-y-8 overflow-y-auto p-4 lg:p-7">
      <VoicesToolbar />
      <VoicesContent />
    </div>
  );
};
