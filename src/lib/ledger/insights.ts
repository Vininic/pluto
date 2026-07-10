/** Deterministic, no-AI insight for the Dashboard's Aetheris card — same
 *  "heuristics-first, AI-second" pattern as Chronos' digests: compute the
 *  aggregate locally, let the model only narrate when the user actually asks.
 *  Priority-ordered: the first check that fires wins. */
import { budgetStatus, goalProgress, monthSummary, shiftMonth } from "./service";
import type { LedgerData } from "./types";

export type Insight =
  | { kind: "over-budget"; categoryId: string; overCents: number }
  | { kind: "goal-deadline"; goalId: string; daysLeft: number; progressPct: number }
  | { kind: "goal-close"; goalId: string; progressPct: number }
  | { kind: "net-negative"; amountCents: number }
  | { kind: "net-improved"; pctChange: number }
  | { kind: "all-clear" };

function daysBetween(fromISO: string, toISO: string): number {
  const from = new Date(`${fromISO}T00:00:00`);
  const to = new Date(`${toISO}T00:00:00`);
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

export function heuristicInsight(data: LedgerData, month: string, today: string = new Date().toISOString().slice(0, 10)): Insight {
  const overBudget = budgetStatus(data, month).filter((s) => s.overBudget);
  if (overBudget.length > 0) {
    const worst = overBudget.reduce((a, b) => (b.spentCents - b.limitCents > a.spentCents - a.limitCents ? b : a));
    return { kind: "over-budget", categoryId: worst.categoryId, overCents: worst.spentCents - worst.limitCents };
  }

  const activeGoals = data.goals.filter((g) => !g.archivedAt);
  const goalsWithProgress = activeGoals.map((g) => ({ goal: g, progress: goalProgress(data, g.id)! }));

  const deadlineSoon = goalsWithProgress
    .filter((x) => x.goal.deadline && x.goal.deadline >= today && x.progress.progressPct < 100)
    .map((x) => ({ ...x, daysLeft: daysBetween(today, x.goal.deadline!) }))
    .filter((x) => x.daysLeft <= 30)
    .sort((a, b) => a.daysLeft - b.daysLeft)[0];
  if (deadlineSoon) return { kind: "goal-deadline", goalId: deadlineSoon.goal.id, daysLeft: deadlineSoon.daysLeft, progressPct: deadlineSoon.progress.progressPct };

  const close = goalsWithProgress
    .filter((x) => x.progress.progressPct >= 80 && x.progress.progressPct < 100)
    .sort((a, b) => b.progress.progressPct - a.progress.progressPct)[0];
  if (close) return { kind: "goal-close", goalId: close.goal.id, progressPct: close.progress.progressPct };

  const summary = monthSummary(data, month);
  if (summary.netCents < 0) return { kind: "net-negative", amountCents: summary.netCents };

  const prev = monthSummary(data, shiftMonth(month, -1));
  if (summary.incomeCents + summary.expenseCents > 0 && prev.netCents > 0) {
    const pctChange = Math.round(((summary.netCents - prev.netCents) / Math.abs(prev.netCents)) * 100);
    if (pctChange > 0) return { kind: "net-improved", pctChange };
  }

  return { kind: "all-clear" };
}
