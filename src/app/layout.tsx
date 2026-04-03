import type { Metadata } from "next";

import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";

import "allotment/dist/style.css";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Torq-AI",
    template: "%s | Torq-AI",
  },
  description:
    "Torq-AI is an AI-native coding workspace for building, editing, previewing, and shipping projects in one place.",
  applicationName: "Torq-AI",
  icons: {
    icon: "/logo.svg",
    shortcut: "/logo.svg",
    apple: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
