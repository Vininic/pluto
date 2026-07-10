import { useState } from "react";
import { Check, Plus } from "lucide-react";
import GoalDetailDialog from "@/components/GoalDetailDialog";
import GoalDialog from "@/components/GoalDialog";
import { Button } from "@/components/ui/button";
import { goalProgress } from "@/lib/ledger/service";
import { useLedger } from "@/lib/ledger/store";
import type { Goal } from "@/lib/ledger/types";
import { useDateFormat, useMoneyFormat, useT } from "@/lib/i18n/I18nProvider";
import { cn } from "@/lib/utils";

const ITEM_PREVIEW_COUNT = 3;

/** The full goal grid, richer than the old Dashboard preview — shows a
 *  checklist preview per card instead of just an item count, since there's
 *  a full page width to use now instead of a dialog's. Inline content — no
 *  Dialog chrome — meant to sit inside a Dashboard tab. */
export default function GoalsPanel() {
  const { data } = useLedger();
  const money = useMoneyFormat();
  const fmt = useDateFormat();
  const t = useT();
  const L = t.pluto.goals;
  const [newOpen, setNewOpen] = useState(false);
  const [detail, setDetail] = useState<Goal | null>(null);

  const active = data.goals.filter((g) => !g.archivedAt);
  const selected = detail ? data.goals.find((g) => g.id === detail.id) ?? null : null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end">
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setNewOpen(true)}>
          <Plus className="mr-1 h-3.5 w-3.5" /> {L.newGoal}
        </Button>
      </div>

      {active.length === 0 ? (
        <p className="pluto-card p-8 text-center text-sm text-muted-foreground">{L.empty}</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {active.map((goal) => {
            const progress = goalProgress(data, goal.id);
            const pct = goal.targetCents > 0 ? Math.min(100, progress?.progressPct ?? 0) : 0;
            const previewItems = goal.items.slice(0, ITEM_PREVIEW_COUNT);
            const remaining = goal.items.length - previewItems.length;
            return (
              <button
                key={goal.id}
                type="button"
                onClick={() => setDetail(goal)}
                className="pluto-card p-4 text-left transition-shadow hover:shadow-elevated"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: goal.color }} />
                    <span className="truncate font-display text-base text-primary">{goal.name}</span>
                  </div>
                  <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                    {L[goal.horizon]}
                  </span>
                </div>
                <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-secondary" style={{ width: `${pct}%` }} />
                </div>
                <div className="num mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{money.format(progress?.contributedCents ?? 0)} / {money.format(goal.targetCents)}</span>
                  {goal.deadline && <span>{fmt.short(goal.deadline)}</span>}
                </div>
                {previewItems.length > 0 && (
                  <div className="mt-3 space-y-1 border-t border-border/60 pt-2.5">
                    {previewItems.map((item) => (
                      <div key={item.id} className="flex items-center gap-1.5 text-xs">
                        <span
                          className={cn(
                            "grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full border",
                            item.done ? "border-secondary bg-secondary text-primary-deep" : "border-border",
                          )}
                        >
                          {item.done && <Check className="h-2 w-2" />}
                        </span>
                        <span className={cn("truncate", item.done ? "text-muted-foreground line-through" : "text-card-foreground")}>{item.name}</span>
                      </div>
                    ))}
                    {remaining > 0 && <div className="pl-5 text-[11px] text-muted-foreground">+{remaining}</div>}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      <GoalDialog open={newOpen} onOpenChange={setNewOpen} />
      <GoalDetailDialog open={!!selected} onOpenChange={(open) => { if (!open) setDetail(null); }} goal={selected} />
    </div>
  );
}
