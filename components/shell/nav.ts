import { BarChart3, CalendarDays, CalendarRange, FileText, Folder, Home, MessageCircle, Sparkles, Users } from "lucide-react";

export const SIDEBAR_NAV = [
  { href: "/", label: "Σήμερα", Icon: CalendarDays },
  { href: "/schedule", label: "Πρόγραμμα", Icon: CalendarRange },
  { href: "/classes", label: "Οι τάξεις μου", Icon: Users },
  { href: "/materials", label: "Υλικό & αρχεία", Icon: Folder },
  { href: "/materials/new", label: "Εργαστήριο AI", Icon: Sparkles },
  { href: "/assessment", label: "Αξιολόγηση", Icon: BarChart3 },
  { href: "/messages", label: "Επικοινωνία", Icon: MessageCircle },
] as const;

export const MOBILE_NAV = [
  { href: "/", label: "Σήμερα", Icon: Home },
  { href: "/classes", label: "Τάξεις", Icon: Users },
  { href: "/materials", label: "Υλικό", Icon: FileText },
  { href: "/schedule", label: "Πρόγραμμα", Icon: CalendarRange },
] as const;

export function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  if (href === "/materials") return pathname.startsWith("/materials") && pathname !== "/materials/new";
  if (href === "/schedule") return pathname.startsWith("/schedule") || pathname.startsWith("/lessons");
  return pathname === href || pathname.startsWith(`${href}/`);
}
