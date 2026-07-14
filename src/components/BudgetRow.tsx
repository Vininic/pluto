import { useState, type DragEvent } from "react";
import { Input } from "@/components/ui/input";
import { useLedger } from "@/lib/ledger/store";
import type { Category } from "@/lib/ledger/types";
import { parseMoneyInput } from "@/lib/money";
import { useMoneyFormat, useT } from "@/lib/i18n/I18nProvider";
import { cn } from "@/lib/utils";

interface BudgetRowProps {
  category: Category;
  limitCents: number;
  spentCents: number;
  overBudget: boolean;
  /** Count of transactions already filed under this category. */
  txCount?: number;
  /** Drag-and-drop target for categorizing an inbox transaction — same card now
   *  does both jobs (budget status + triage) instead of switching between two
   *  visually unrelated views for the same category list. */
  isDropTarget?: boolean;
  onDragOver?: () => void;
  onDragLeave?: () => void;
  onDrop?: () => void;
}

export default function BudgetRow({
  category, limitCents, spentCents, overBudget,
  txCount, isDropTarget, onDragOver, onDragLeave, onDrop,
}: BudgetRowProps) {
  const { setBudget } = useLedger();
  const money = useMoneyFormat();
  const t = useT();
  const L = t.pluto.budgets;
  const [draft, setDraft] = useState(limitCents > 0 ? (limitCents / 100).toFixed(2).replace(".", ",") : "");
  const [editing, setEditing] = useState(false);

  function commit() {
    const cents = parseMoneyInput(draft);
    if (cents !== null && cents >= 0) setBudget({ categoryId: category.id, monthCents: cents });
    setEditing(false);
  }

  const pct = limitCents > 0 ? Math.min(100, Math.round((spentCents / limitCents) * 100)) : 0;
  const dropHandlers = onDrop ? {
    onDragOver: (e: DragEvent) => { e.preventDefault(); onDragOver?.(); },
    onDragLeave: () => onDragLeave?.(),
    onDrop: (e: DragEvent) => { e.preventDefault(); onDrop(); },
  } : undefined;

  return (
    <div
      {...dropHandlers}
      style={{ borderLeftColor: category.color, borderLeftWidth: 3 }}
      className={cn(
        "pluto-card flex flex-col gap-1.5 px-3.5 py-1.5 transition-colors sm:flex-row sm:items-center sm:gap-3",
        isDropTarget && "border-secondary bg-secondary/10 ring-1 ring-secondary/40",
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: category.color }} />
        <span className="min-w-0 flex-1 truncate font-medium text-primary">{category.name}</span>
        {typeof txCount === "number" && <span className="num shrink-0 text-[11px] text-muted-foreground/70">({txCount})</span>}
      </div>

      {/* Amount lives on its own row below `sm` — the combined "spent / limit"
          string is wide enough that squeezing it onto the name's line at
          phone widths pushed the name back into truncating. */}
      <div className="flex shrink-0 items-center justify-end gap-3">
        {limitCents > 0 && (
          <div className="hidden h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-muted sm:block">
            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: overBudget ? "hsl(var(--destructive))" : category.color }} />
          </div>
        )}

        {editing ? (
          <Input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }}
            placeholder="0,00"
            inputMode="decimal"
            className="h-7 w-24 shrink-0 text-right text-xs"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className={cn("num shrink-0 text-xs hover:text-primary", overBudget ? "font-medium text-destructive" : "text-muted-foreground")}
          >
            {limitCents > 0 ? `${money.format(spentCents)} / ${money.format(limitCents)}` : L.noLimit}
          </button>
        )}
      </div>
    </div>
  );
}
