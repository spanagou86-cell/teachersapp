import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import { AppShell } from "@/components/shell/AppShell";
import { PREFS_BOOT } from "@/lib/prefs-boot";
import "./globals.css";

const manrope = Manrope({ subsets: ["latin", "greek"], variable: "--font-manrope", display: "swap" });

export const metadata: Metadata = {
  title: { default: "τάξη — Η τάξη σου. Μαζί σου.", template: "%s · τάξη" },
  description: "Πρόγραμμα, μαθητές και υλικό σε ένα μέρος. Ανέβασε ένα αρχείο, προσάρμοσέ το, σύνδεσέ το με το μάθημα και κατέγραψε τι διδάχθηκε.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f6f1" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1612" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="el" className={manrope.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: PREFS_BOOT }} />
      </head>
      <body className="font-sans antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
