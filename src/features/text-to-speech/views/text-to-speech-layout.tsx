import { PageHeader } from "@/components/page-header";

export function TextToSpeechLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background">
      <PageHeader title="Text to speech" description="Create studio-ready speech from text" />
      {children}
    </div>
  );
};
