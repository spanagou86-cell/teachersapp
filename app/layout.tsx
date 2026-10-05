import type { Metadata, Viewport } from "next";
import { Inter_Tight, JetBrains_Mono } from "next/font/google";
import { ServiceWorker } from "@/components/pwa";
import { AppShell } from "@/components/shell/AppShell";
import { PREFS_BOOT } from "@/lib/prefs-boot";
import "./globals.css";

const sans = Inter_Tight({ subsets: ["latin", "greek"], variable: "--font-inter-tight", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin", "greek"], variable: "--font-jetbrains", display: "swap", weight: ["400", "500", "600"] });

export const metadata: Metadata = {
  title: { default: "τάξη — Η τάξη σου. Μαζί σου.", template: "%s · τάξη" },
  description: "Πρόγραμμα, μαθητές και υλικό σε ένα μέρος. Ανέβασε ένα αρχείο, προσάρμοσέ το, σύνδεσέ το με το μάθημα και κατέγραψε τι διδάχθηκε.",
  applicationName: "τάξη",
  appleWebApp: { capable: true, title: "τάξη", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#f6f4ee",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="el" className={`${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: PREFS_BOOT }} />
      </head>
      <body className="font-sans antialiased">
        <AppShell>{children}</AppShell>
        <ServiceWorker />
      </body>
    </html>
  );
}
