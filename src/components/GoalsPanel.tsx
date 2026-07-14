import { useState } from "react";
import { Check, Plus, Target } from "lucide-react";
import GoalDetailDialog from "@/components/GoalDetailDialog";
import GoalDialog from "@/components/GoalDialog";
import { Button } from "@/components/ui/button";
import { goalProgress } from "@/lib/ledger/service";
import { useLedger } from "@/lib/ledger/store";
import type { Goal } from "@/lib/ledger/types";
import { useDateFormat, useMoneyFormat, useT } from "@/lib/i18n/I18nProvider";
import { cn } from "@/lib/utils";

/** The full goal grid, richer than the old Dashboard preview — shows the
 *  whole checklist per card instead of just an item count, since there's
 *  a full page width to use now instead of a dialog's. Inline content — no
 *  Dialog chrome — meant to sit inside a Dashboard tab.
 *
 *  Bounded like Kairos' `BoardColumn`: header (title + button) lives inside
 *  one card boundary instead of floating loose above a bare list, and the
 *  whole list caps its own height with a scroll — past goal counts don't
 *  push the rest of the dashboard down. Each card shows every item (not a
 *  truncated preview) since the outer scroll already absorbs the height. */
export default function GoalsPanel() {
  const { data, updateGoalItem } = useLedger();
  const money = useMoneyFormat();
  const fmt = useDateFormat();
  const t = useT();
  const L = t.pluto.goals;
  const [newOpen, setNewOpen] = useState(false);
  const [detail, setDetail] = useState<Goal | null>(null);

  const active = data.goals.filter((g) => !g.archivedAt);
  const selected = detail ? data.goals.find((g) => g.id === detail.id) ?? null : null;

  return (
    <section className="flex flex-col overflow-hidden rounded-xl border border-border/70 bg-surface-veil/40">
      <header className="flex shrink-0 items-center gap-2 px-3.5 pb-2 pt-3">
        <Target className="h-4 w-4 text-secondary" />
        <h2 className="font-display text-lg text-primary">{t.pluto.dashboard.tabGoals}</h2>
        <Button size="sm" variant="outline" className="ml-auto h-7 text-xs" onClick={() => setNewOpen(true)}>
          <Plus className="mr-1 h-3.5 w-3.5" /> {L.newGoal}
        </Button>
      </header>
      <div className="vault-rule mx-3.5 shrink-0" />

      {active.length === 0 ? (
        <p className="p-8 text-center text-sm text-muted-foreground">{L.empty}</p>
      ) : (
        <div className="grid max-h-[340px] grid-cols-1 gap-2 overflow-y-auto p-2">
          {active.map((goal) => {
            const progress = goalProgress(data, goal.id);
            const pct = goal.targetCents > 0 ? Math.min(100, progress?.progressPct ?? 0) : 0;
            return (
              <div
                key={goal.id}
                role="button"
                tabIndex={0}
                onClick={() => setDetail(goal)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setDetail(goal); } }}
                style={{ background: `${goal.color}10`, borderColor: `${goal.color}40` }}
                className="pluto-card relative cursor-pointer p-3 pl-5 text-left transition-shadow hover:shadow-elevated"
              >
                <span className="absolute bottom-1.5 left-1.5 top-1.5 w-[3px] rounded-full" style={{ background: goal.color }} />
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 flex-1 truncate font-display text-base text-primary">{goal.name}</span>
                  <span
                    className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider"
                    style={{ background: `${goal.color}22`, color: goal.color }}
                  >
                    {L[goal.horizon]}
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: goal.color }} />
                </div>
                <div className="num mt-1 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{money.format(progress?.contributedCents ?? 0)} / {money.format(goal.targetCents)}</span>
                  {goal.deadline && <span>{fmt.short(goal.deadline)}</span>}
                </div>
                {/* Always render this footer, checklist or not — a goal without items used to
                    just skip the block, leaving its card shorter than its siblings in the same
                    grid row. A one-line fallback keeps every card the same shape. Checkboxes are
                    real buttons here (stopPropagation so they don't also open the detail dialog) —
                    they used to just look like the real toggle inside the dialog without acting
                    like one. */}
                <div className="mt-2 space-y-1 border-t border-border/60 pt-2">
                  {goal.items.length > 0 ? (
                    goal.items.map((item) => (
                      <div key={item.id} className="flex items-center gap-1.5 text-xs">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); updateGoalItem(goal.id, item.id, { done: !item.done }); }}
                          className={cn(
                            "grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full border",
                            item.done ? "border-secondary bg-secondary text-primary-deep" : "border-border hover:border-secondary",
                          )}
                        >
                          {item.done && <Check className="h-2 w-2" />}
                        </button>
                        <span className={cn("truncate", item.done ? "text-muted-foreground line-through" : "text-card-foreground")}>{item.name}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-[11px] text-muted-foreground/70">{L.noItems}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <GoalDialog open={newOpen} onOpenChange={setNewOpen} />
      <GoalDetailDialog open={!!selected} onOpenChange={(open) => { if (!open) setDetail(null); }} goal={selected} />
    </section>
  );
}
