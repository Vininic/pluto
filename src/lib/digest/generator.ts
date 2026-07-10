/** The fuller "what's going on" digest for Aetheris — a superset of the
 *  single-headline `heuristicInsight()` used on the Dashboard card. Same
 *  rule: everything here is computed locally, zero AI calls. Mirrors
 *  Chronos'/Kairos' `lib/digest/generator.ts` shape (a card list with a
 *  severity, regenerated on demand rather than kept live). */
import { budgetStatus, goalProgress, monthSummary, shiftMonth } from "@/lib/ledger/service";
import type { LedgerData } from "@/lib/ledger/types";
import type { Digest, ReportCard } from "./types";

export function generateDigest(data: LedgerData, month: string): Digest {
  const cards: ReportCard[] = [];

  for (const b of budgetStatus(data, month)) {
    if (b.overBudget) cards.push({ kind: "overBudget", categoryId: b.categoryId, overCents: b.spentCents - b.limitCents });
  }

  const today = new Date().toISOString().slice(0, 10);
  const activeGoals = data.goals.filter((g) => !g.archivedAt);
  for (const g of activeGoals) {
    const progress = goalProgress(data, g.id);
    if (!progress) continue;
    if (g.deadline && g.deadline >= today && progress.progressPct < 100) {
      const daysLeft = Math.round((new Date(`${g.deadline}T00:00:00`).getTime() - new Date(`${today}T00:00:00`).getTime()) / 86_400_000);
      if (daysLeft <= 30) cards.push({ kind: "goalDeadlineSoon", goalId: g.id, daysLeft, progressPct: progress.progressPct });
    } else if (progress.progressPct >= 80 && progress.progressPct < 100) {
      cards.push({ kind: "goalNearDone", goalId: g.id, progressPct: progress.progressPct });
    }
  }

  const uncategorized = data.transactions.filter((t) => !t.categoryId && t.type !== "transfer").length;
  if (uncategorized >= 3) cards.push({ kind: "uncategorizedPile", count: uncategorized });

  const summary = monthSummary(data, month);
  if (summary.netCents < 0) cards.push({ kind: "netNegative", amountCents: summary.netCents });

  const prevMonths = [1, 2, 3].map((n) => monthSummary(data, shiftMonth(month, -n)).expenseCents).filter((c) => c > 0);
  if (prevMonths.length > 0 && summary.expenseCents > 0) {
    const avgPrev = prevMonths.reduce((a, b) => a + b, 0) / prevMonths.length;
    const pctChange = Math.round(((summary.expenseCents - avgPrev) / avgPrev) * 100);
    if (pctChange >= 20) cards.push({ kind: "spendingUp", pctChange });
    else if (pctChange <= -20) cards.push({ kind: "spendingDown", pctChange: Math.abs(pctChange) });
  }

  if (cards.length === 0) cards.push({ kind: "allClear" });

  return { month, generatedAt: new Date().toISOString(), cards };
}
