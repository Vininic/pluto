import { useState } from "react";
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
}

export default function BudgetRow({ category, limitCents, spentCents, overBudget }: BudgetRowProps) {
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

  return (
    <div className="pluto-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: category.color }} />
          <span className="truncate font-medium text-primary">{category.name}</span>
        </div>
        {editing ? (
          <Input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }}
            placeholder="0,00"
            inputMode="decimal"
            className="h-8 w-28 text-right"
          />
        ) : (
          <button type="button" onClick={() => setEditing(true)} className="num text-sm text-muted-foreground hover:text-primary">
            {limitCents > 0 ? money.format(limitCents) : L.noLimit}
          </button>
        )}
      </div>
      {limitCents > 0 && (
        <>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
            <div className={cn("h-full rounded-full", overBudget ? "bg-destructive" : "bg-secondary")} style={{ width: `${pct}%` }} />
          </div>
          <div className="num mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{L.spent}: {money.format(spentCents)}</span>
            <span className={overBudget ? "font-medium text-destructive" : ""}>
              {overBudget ? L.overBudget : `${L.remaining}: ${money.format(limitCents - spentCents)}`}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
