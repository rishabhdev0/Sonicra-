import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Toaster } from "@/components/ui/sonner";
import { ClerkProvider } from "@clerk/nextjs";
import { TRPCReactProvider } from "@/trpc/client";
import { ThemeProvider } from "@/components/theme-provider";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Sonicra", template: "%s | Sonicra" },
  description: "AI-powered text-to-speech and zero-shot voice cloning",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider>
      <TRPCReactProvider>
        <html lang="en" suppressHydrationWarning className="light">
          <body className={`${inter.variable} ${geistMono.variable} antialiased`}>
            <ThemeProvider>
              <NuqsAdapter>{children}</NuqsAdapter>
              <Toaster />
            </ThemeProvider>
          </body>
        </html>
      </TRPCReactProvider>
    </ClerkProvider>
  );
}