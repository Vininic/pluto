/** Serialize the ledger for the model — compact, ids included, NEVER the raw
 *  transaction list beyond a recent tail. Per PLUTO.md's AI section: wallets
 *  + balances, categories, current + previous month summaries, budget
 *  statuses, goals progress, last 15 transactions. */
import { budgetStatus, goalProgress, monthSummary, shiftMonth, walletBalance } from "@/lib/ledger/service";
import type { LedgerData } from "@/lib/ledger/types";
import { brl } from "./format";

export function buildSystemPrompt(data: LedgerData, today: string, localeLabel: string): string {
  return `You are Aetheris, the assistant of the Olympus Suite, working inside Pluto — a personal finance ledger. All money is BRL, stored as integer cents.
Today is ${today}. Be concise and concrete.
The user's UI language is ${localeLabel}. Always reply in that language, even if the ledger data (names, descriptions) is in a different one — unless the user explicitly writes to you in another language, in which case switch to that.
Use light markdown — **bold**, bullet lists, short "##" headings — to structure longer answers; keep one-line answers plain.

THE LEDGER (ids in brackets):
${serializeLedger(data, today)}

You can change the ledger by including ONE fenced block in your reply, exactly like:
\`\`\`actions
[{"type":"add_transaction","wallet":"<wallet name or id>","category":"<category name or id>?","txType":"income|expense|transfer","amountCents":4590,"date":"2026-07-10","description":"..."}]
\`\`\`
Available actions:
- {"type":"create_wallet","name":"...","walletType":"cash|checking|savings|credit"?,"color":"?"}
- {"type":"create_category","name":"...","kind":"income|expense","color":"?"}
- {"type":"add_transaction","wallet":"...","category":"?","txType":"income|expense|transfer","amountCents":1234,"date":"yyyy-MM-dd","description":"...","transferTo":"? (wallet, transfer only)"}
- {"type":"add_transactions","transactions":[{...same shape as add_transaction, minus the type wrapper...}]}   (batch import)
- {"type":"categorize","transactionIds":["id1","id2"],"category":"..."}
- {"type":"set_budget","category":"...","monthCents":1234}
- {"type":"create_goal","name":"...","horizon":"short|long"?,"targetCents":1234?,"deadline":"yyyy-MM-dd?"}
- {"type":"add_goal_item","goal":"...","name":"...","priceCents":1234,"url":"?"}
- {"type":"contribute_to_goal","goal":"...","amountCents":1234,"date":"yyyy-MM-dd","wallet":"?"}
Rules: only include the block when the user asks for changes; refer to wallets/categories/goals by their exact name or id; amounts are integer cents (R$45,90 = 4590); propose the smallest set of actions that does the job; explain what you propose in prose OUTSIDE the block, in plain natural language — never mention the JSON "type" identifiers above (like add_goal_item) or any JSON syntax in your prose, describe the change the way a person would.`;
}

export function serializeLedger(data: LedgerData, today: string): string {
  const lines: string[] = [];
  const month = today.slice(0, 7);
  const prevMonth = shiftMonth(month, -1);

  const wallets = data.wallets.filter((w) => !w.archivedAt);
  lines.push(wallets.length === 0 ? "Wallets: (none yet)" : "Wallets:");
  for (const w of wallets) {
    lines.push(`  - "${w.name}" [${w.id}] (${w.type}): ${brl(walletBalance(data, w.id))}`);
  }

  const categories = data.categories.filter((c) => !c.archivedAt);
  lines.push(categories.length === 0 ? "Categories: (none yet)" : "Categories:");
  for (const c of categories) {
    lines.push(`  - "${c.name}" [${c.id}] (${c.kind})`);
  }

  for (const [label, m] of [["This month", month], ["Last month", prevMonth]] as const) {
    const s = monthSummary(data, m);
    lines.push(`${label} (${m}): income ${brl(s.incomeCents)}, expense ${brl(s.expenseCents)}, net ${brl(s.netCents)}`);
  }

  const budgets = budgetStatus(data, month);
  if (budgets.length > 0) {
    lines.push("Budgets (this month):");
    for (const b of budgets) {
      const category = categories.find((c) => c.id === b.categoryId);
      lines.push(`  - "${category?.name ?? b.categoryId}": spent ${brl(b.spentCents)} of ${brl(b.limitCents)}${b.overBudget ? " (OVER)" : ""}`);
    }
  }

  const goals = data.goals.filter((g) => !g.archivedAt);
  if (goals.length > 0) {
    lines.push("Goals:");
    for (const g of goals) {
      const p = goalProgress(data, g.id)!;
      lines.push(`  - "${g.name}" [${g.id}] (${g.horizon}): ${brl(p.contributedCents)} of ${brl(g.targetCents)}${g.deadline ? `, due ${g.deadline}` : ""}`);
    }
  }

  const recent = [...data.transactions].sort((a, b) => (b.date + b.createdAt).localeCompare(a.date + a.createdAt)).slice(0, 15);
  if (recent.length > 0) {
    lines.push("Last 15 transactions:");
    for (const t of recent) {
      const wallet = data.wallets.find((w) => w.id === t.walletId);
      const category = categories.find((c) => c.id === t.categoryId);
      lines.push(`  - [${t.id}] ${t.date} "${t.description}" ${t.type} ${brl(t.amountCents)} · ${wallet?.name ?? "?"}${category ? ` · ${category.name}` : t.type === "transfer" ? "" : " · uncategorized"}`);
    }
  }

  return lines.join("\n").slice(0, 6000);
}
