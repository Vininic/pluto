/** Plain, inline-styled HTML — email clients don't run app CSS, so this
 *  can't reuse any suite component. Labels are passed in from the page
 *  (which already has the active dictionary) rather than duplicated here. */
import { brl } from "@/lib/ai/format";
import type { LedgerData } from "@/lib/ledger/types";
import type { Report } from "./types";

export interface EmailLabels {
  netBalance: string;
  income: string;
  expense: string;
  categoryTable: string;
  budgetReview: string;
  goalsDelta: string;
  uncategorized: string;
}

function categoryName(data: LedgerData, id: string | null): string {
  return id ? data.categories.find((c) => c.id === id)?.name ?? id : "";
}

export function buildReportEmailHtml(data: LedgerData, report: Report, labels: EmailLabels): string {
  const categoryRows = report.categories
    .map((c) => `<tr><td style="padding:4px 8px;">${categoryName(data, c.categoryId) || labels.uncategorized}</td><td style="padding:4px 8px;text-align:right;">${brl(c.incomeCents)}</td><td style="padding:4px 8px;text-align:right;">${brl(c.expenseCents)}</td></tr>`)
    .join("");

  const budgetRows = report.budgets
    .map((b) => `<tr><td style="padding:4px 8px;">${categoryName(data, b.categoryId)}</td><td style="padding:4px 8px;text-align:right;${b.overBudget ? "color:#b23a2e;font-weight:600;" : ""}">${brl(b.spentCents)} / ${brl(b.limitCents)}</td></tr>`)
    .join("");

  const goalRows = report.goals
    .map((g) => {
      const goal = data.goals.find((gg) => gg.id === g.goalId);
      return `<tr><td style="padding:4px 8px;">${goal?.name ?? g.goalId}</td><td style="padding:4px 8px;text-align:right;">${brl(g.contributedCents)} / ${brl(g.targetCents)} (${g.progressPct}%)</td></tr>`;
    })
    .join("");

  return `
<div style="font-family:Georgia,serif;color:#183427;max-width:560px;margin:0 auto;">
  <h1 style="font-size:24px;">${report.month}</h1>
  <p style="font-size:13px;text-transform:uppercase;letter-spacing:0.08em;color:#8a8a8a;">${labels.netBalance}</p>
  <p style="font-size:32px;font-weight:600;margin:0 0 16px;">${brl(report.netCents)}</p>
  <p style="font-size:14px;color:#555;">${labels.income}: ${brl(report.incomeCents)} &middot; ${labels.expense}: ${brl(report.expenseCents)}</p>

  ${report.narrative ? `<p style="font-size:14px;line-height:1.6;border-left:3px solid #c49a3a;padding-left:12px;margin:20px 0;">${report.narrative}</p>` : ""}

  <h2 style="font-size:16px;margin-top:24px;">${labels.categoryTable}</h2>
  <table style="width:100%;border-collapse:collapse;font-size:13px;">${categoryRows || "<tr><td style=\"padding:4px 8px;\">—</td></tr>"}</table>

  ${report.budgets.length > 0 ? `<h2 style="font-size:16px;margin-top:24px;">${labels.budgetReview}</h2><table style="width:100%;border-collapse:collapse;font-size:13px;">${budgetRows}</table>` : ""}

  ${report.goals.length > 0 ? `<h2 style="font-size:16px;margin-top:24px;">${labels.goalsDelta}</h2><table style="width:100%;border-collapse:collapse;font-size:13px;">${goalRows}</table>` : ""}

  <p style="margin-top:32px;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:0.1em;">Pluto &middot; Olympus Suite</p>
</div>`.trim();
}
