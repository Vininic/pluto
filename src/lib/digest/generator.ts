/** The fuller "what's going on" digest for Aetheris — tries the AI insight
 *  pass (lib/ai/insight.ts) first and falls back to the deterministic
 *  modules below when it's unavailable, fails, or returns nothing usable.
 *  Same AI-first, heuristic-fallback shape as Chronos'/Kairos'
 *  lib/digest/generator.ts. */
import { budgetStatus, goalProgress, monthSummary, shiftMonth } from "@/lib/ledger/service";
import type { LedgerData } from "@/lib/ledger/types";
import { aiDigestCards } from "@/lib/ai/insight";
import { LOCALE_LABELS, type Locale } from "@/lib/i18n/dictionaries";
import type { Digest, ReportCard } from "./types";

function heuristicCards(data: LedgerData, month: string): ReportCard[] {
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

  return cards;
}

export async function generateDigest(data: LedgerData, month: string, locale: Locale = "pt"): Promise<Digest> {
  const ai = await aiDigestCards(data, month, LOCALE_LABELS[locale].long);
  if (ai && ai.length > 0) {
    return {
      month,
      generatedAt: new Date().toISOString(),
      cards: ai.map((c): ReportCard => ({ kind: "ai", title: c.title, body: c.body, severity: c.severity })),
      generatedBy: "ai",
    };
  }
  return {
    month,
    generatedAt: new Date().toISOString(),
    cards: heuristicCards(data, month),
    generatedBy: "heuristic",
  };
}
