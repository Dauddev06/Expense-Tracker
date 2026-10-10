import Link from "next/link";
import { Icon } from "@/components/icons";

// The same header on every page: title, one line of help, one main action.
export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="page-title">{title}</h1>
        {description && <p className="page-subtitle">{description}</p>}
      </div>
      {action}
    </div>
  );
}

// "← Back to …" at the top of sub-pages
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="btn-link -ml-3">
      <Icon name="arrow-left" className="size-4" />
      {label}
    </Link>
  );
}

// Every "add / edit" page looks the same: back link, then one card with
// a title, a line of help and the form.
export function FormCard({
  back,
  title,
  intro,
  children,
}: {
  back: { href: string; label: string };
  title: string;
  intro?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-xl space-y-3">
      <BackLink href={back.href} label={back.label} />
      <div className="card">
        <h1 className="page-title">{title}</h1>
        {intro && <p className="page-subtitle">{intro}</p>}
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
