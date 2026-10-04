import { Compass } from "lucide-react";
import { ButtonLink, EmptyState } from "@/components/ui";

export default function NotFound() {
  return <EmptyState icon={<Compass className="size-6" />} title="Η σελίδα δεν βρέθηκε" action={<ButtonLink href="/">Στην αρχική</ButtonLink>} />;
}
