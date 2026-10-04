import { Hourglass } from "lucide-react";
import { MobileBrandBar, PageHeader } from "./shell/PageHeader";
import { ButtonLink, Card, EmptyState } from "./ui";

export function ComingSoon({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <MobileBrandBar />
      <PageHeader title={title} />
      <Card>
        <EmptyState
          icon={<Hourglass className="size-6" />}
          title="Δεν είναι μέρος αυτού του πρωτοτύπου"
          text={text}
          action={<ButtonLink href="/about" variant="secondary">Τι λειτουργεί σήμερα</ButtonLink>}
        />
      </Card>
    </div>
  );
}
