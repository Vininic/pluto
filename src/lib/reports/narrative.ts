/** Optional AI narrative on top of the deterministic report — same
 *  heuristics-first, AI-second pattern as everywhere else. Text-only, so it
 *  works through whatever provider the user already has configured for
 *  Aetheris (no image support needed, unlike statement import). */
import { streamChat } from "@/lib/ai/providers";
import { loadAiSettings } from "@/lib/ai/settings";
import { brl } from "@/lib/ai/format";
import type { LedgerData } from "@/lib/ledger/types";
import type { Report } from "./types";

function categoryName(data: LedgerData, id: string | null): string {
  return id ? data.categories.find((c) => c.id === id)?.name ?? id : "Uncategorized";
}

function buildNarrativePrompt(data: LedgerData, report: Report): string {
  const lines: string[] = [
    `Month: ${report.month}`,
    `Income: ${brl(report.incomeCents)}, Expense: ${brl(report.expenseCents)}, Net: ${brl(report.netCents)} (previous month net: ${brl(report.prevNetCents)})`,
  ];

  if (report.categories.length > 0) {
    lines.push("By category:");
    for (const c of report.categories) {
      lines.push(`  - ${categoryName(data, c.categoryId)}: income ${brl(c.incomeCents)}, expense ${brl(c.expenseCents)}`);
    }
  }
  if (report.budgets.length > 0) {
    lines.push("Budgets:");
    for (const b of report.budgets) {
      lines.push(`  - ${categoryName(data, b.categoryId)}: spent ${brl(b.spentCents)} of ${brl(b.limitCents)}${b.overBudget ? " (OVER)" : ""}`);
    }
  }
  if (report.goals.length > 0) {
    lines.push("Goals:");
    for (const g of report.goals) {
      const goal = data.goals.find((gg) => gg.id === g.goalId);
      lines.push(`  - ${goal?.name ?? g.goalId}: ${brl(g.contributedCents)} of ${brl(g.targetCents)} (${g.progressPct}%), +${brl(g.deltaCentsThisMonth)} this month`);
    }
  }

  return `Write a short (3-5 sentence) narrative summary of this personal finance report, in the user's language, warm but concrete — highlight the single most important change or risk, don't just restate every number. Data:\n${lines.join("\n")}`;
}

export async function generateNarrative(data: LedgerData, report: Report): Promise<string> {
  const settings = loadAiSettings();
  const prompt = buildNarrativePrompt(data, report);
  const text = await streamChat(settings, [{ role: "user", content: prompt }], () => {});
  return text.trim();
}
