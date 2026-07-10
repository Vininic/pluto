/** Deterministic report aggregates — pure, no AI. Reuses the same tested M1
 *  service functions the Dashboard already calls; a narrative can be added
 *  on top afterward (see narrative.ts), never the other way around. */
import { budgetStatus, goalProgress, monthSummary, shiftMonth } from "@/lib/ledger/service";
import { makeId, type LedgerData } from "@/lib/ledger/types";
import type { Report } from "./types";

export function buildReport(data: LedgerData, month: string): Report {
  const summary = monthSummary(data, month);
  const prevSummary = monthSummary(data, shiftMonth(month, -1));
  const budgets = budgetStatus(data, month);

  const goals = data.goals
    .filter((g) => !g.archivedAt)
    .map((g) => {
      const progress = goalProgress(data, g.id)!;
      const deltaCentsThisMonth = data.contributions
        .filter((c) => c.goalId === g.id && c.date.slice(0, 7) === month)
        .reduce((acc, c) => acc + c.amountCents, 0);
      return {
        goalId: g.id,
        targetCents: g.targetCents,
        contributedCents: progress.contributedCents,
        progressPct: progress.progressPct,
        deltaCentsThisMonth,
      };
    });

  return {
    id: makeId(),
    month,
    generatedAt: new Date().toISOString(),
    incomeCents: summary.incomeCents,
    expenseCents: summary.expenseCents,
    netCents: summary.netCents,
    prevNetCents: prevSummary.netCents,
    categories: summary.byCategory,
    budgets,
    goals,
  };
}
