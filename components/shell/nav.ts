import { CalendarDays, Clock3, FileText, Users } from "lucide-react";

/** Four places, the same on phone and computer. */
export const NAV = [
  { href: "/", label: "Σήμερα", Icon: Clock3, key: "t" },
  { href: "/schedule", label: "Ημερολόγιο", Icon: CalendarDays, key: "h" },
  { href: "/classes", label: "Τάξεις", Icon: Users, key: "c" },
  { href: "/materials", label: "Υλικό", Icon: FileText, key: "m" },
] as const;

export function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  if (href === "/schedule") return pathname.startsWith("/schedule") || pathname.startsWith("/lessons") || pathname.startsWith("/journal");
  if (href === "/classes") return pathname.startsWith("/classes") || pathname.startsWith("/students");
  return pathname === href || pathname.startsWith(`${href}/`);
}
