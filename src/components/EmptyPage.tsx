import type { LucideIcon } from "lucide-react";

interface Props {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  lead: string;
  milestone: string;
}

/** Shared shape for the M0 placeholder pages — routed but not yet built.
 *  Each domain page (Dashboard, Transactions, Triage…) swaps this out for
 *  real content in its own milestone; see PLUTO.md. */
export default function EmptyPage({ icon: Icon, eyebrow, title, lead, milestone }: Props) {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-2xl flex-col items-center justify-center text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary text-primary-foreground">
        <Icon className="h-6 w-6" />
      </div>
      <div className="mt-6 text-[11px] uppercase tracking-[0.22em] text-secondary">{eyebrow}</div>
      <h1 className="font-display mt-2 text-3xl text-primary">{title}</h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">{lead}</p>
      <div className="mt-6 rounded-full border border-border bg-card px-4 py-1.5 text-xs text-muted-foreground">
        {milestone}
      </div>
    </div>
  );
}
