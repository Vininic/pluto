import { ChevronLeft, ChevronRight } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";

interface MonthStepperProps {
  month: string;
  onChange: (month: string) => void;
  className?: string;
}

/** A "‹ July 2026 ›" pill, replacing the raw `<input type="month">` browser
 *  widget — matches the segmented range controls in finance dashboards
 *  (7D/1M/1Y-style pickers) instead of looking like a stray form field. */
export default function MonthStepper({ month, onChange, className }: MonthStepperProps) {
  const { bcp47 } = useI18n();
  const rawLabel = new Intl.DateTimeFormat(bcp47, { month: "long", year: "numeric" }).format(new Date(`${month}-01T00:00:00`));
  const label = rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1);

  function shift(delta: number) {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    onChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  return (
    <div className={`flex items-center gap-0.5 rounded-full border border-border bg-card p-1 ${className ?? ""}`}>
      <button type="button" onClick={() => shift(-1)} className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-primary">
        <ChevronLeft className="h-4 w-4" />
      </button>
      <span className="num min-w-[8rem] text-center text-sm font-medium text-primary">{label}</span>
      <button type="button" onClick={() => shift(1)} className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-primary">
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
