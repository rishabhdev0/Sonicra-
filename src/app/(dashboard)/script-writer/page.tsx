import type { Metadata } from "next";
import { ScriptWriterView } from "@/features/script-writer/views/script-writer-view";

export const metadata: Metadata = { title: "AI Script Writer" };

export default function ScriptWriterPage() {
  return <ScriptWriterView />;
}