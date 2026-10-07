import { CalendarDays, FileText, Home, Users } from "@/components/icons";

/** Four places, the same on phone and computer. */
export const NAV = [
  { href: "/", label: "Αρχική", Icon: Home, key: "h" },
  { href: "/schedule", label: "Πρόγραμμα", Icon: CalendarDays, key: "p" },
  { href: "/classes", label: "Τάξεις", Icon: Users, key: "c" },
  { href: "/materials", label: "Υλικό", Icon: FileText, key: "m" },
] as const;

export function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  if (href === "/schedule") return pathname.startsWith("/schedule") || pathname.startsWith("/lessons") || pathname.startsWith("/journal");
  if (href === "/classes") return pathname.startsWith("/classes") || pathname.startsWith("/students");
  return pathname === href || pathname.startsWith(`${href}/`);
}
