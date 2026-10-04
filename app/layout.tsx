import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import { AppShell } from "@/components/shell/AppShell";
import "./globals.css";

const manrope = Manrope({ subsets: ["latin", "greek"], variable: "--font-manrope", display: "swap" });

export const metadata: Metadata = {
  title: { default: "τάξη — Η τάξη σου. Μαζί σου.", template: "%s · τάξη" },
  description: "Πρόγραμμα, μαθητές και υλικό σε ένα μέρος. Ανέβασε ένα αρχείο, προσάρμοσέ το, σύνδεσέ το με το μάθημα και κατέγραψε τι διδάχθηκε.",
};

export const viewport: Viewport = {
  themeColor: "#f6f6f1",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="el" className={manrope.variable}>
      <body className="font-sans antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
