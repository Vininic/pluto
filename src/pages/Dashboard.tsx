import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Receipt } from "lucide-react";
import AetherisInsightCard from "@/components/AetherisInsightCard";
import CategoriesPanel from "@/components/CategoriesPanel";
import GoalsPanel from "@/components/GoalsPanel";
import EvolutionChart from "@/components/charts/EvolutionChart";
import TopExpensesChart from "@/components/charts/TopExpensesChart";
import MonthStepper from "@/components/MonthStepper";
import { currentYYYYMM, evolution, monthSummary, topExpenses } from "@/lib/ledger/service";
import { useLedger } from "@/lib/ledger/store";
import { useMoneyFormat, useT } from "@/lib/i18n/I18nProvider";
import { cn } from "@/lib/utils";

const TYPE_ICON = { income: ArrowDownLeft, expense: ArrowUpRight, transfer: ArrowLeftRight } as const;

/** One continuous page instead of three tabs (Overview / Categories / Goals) —
 *  but as two columns running in PARALLEL, not sections stacked one after
 *  another. Categories and Goals are compact enough that hiding them behind a
 *  click wasted more than it organized; appending them full-width below the
 *  stats row just traded empty space for scroll length. The left column
 *  (stats + goals) and right column (chart + categories) grow independently,
 *  so the page's total height is whichever column is taller — not both
 *  summed — keeping the whole dashboard on one screen on most displays. */
export default function Dashboard() {
  const { data } = useLedger();
  const money = useMoneyFormat();
  const t = useT();
  const L = t.pluto.dashboard;
  const [month, setMonth] = useState(currentYYYYMM());

  const summary = monthSummary(data, month);
  const top5 = topExpenses(data, month, 5);
  const recent = [...data.transactions].sort((a, b) => (b.date + b.createdAt).localeCompare(a.date + a.createdAt)).slice(0, 3);
  const evolutionPoints = evolution(data, 12, month);

  const categoryName = (id: string | null) => (id ? data.categories.find((c) => c.id === id)?.name ?? t.pluto.transactions.uncategorized : t.pluto.transactions.uncategorized);
  const categoryColor = (id: string | null) => (id ? data.categories.find((c) => c.id === id)?.color : undefined) ?? "hsl(var(--muted-foreground))";

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-3">
      <header>
        <div className="text-[11px] uppercase tracking-[0.22em] text-secondary">{L.eyebrow}</div>
        <h1 className="font-display mt-1 text-3xl text-primary">{L.title}</h1>
      </header>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-5">
        {/* Left column — stats + goals */}
        <div className="flex flex-col gap-3 lg:col-span-2">
          <section className="pluto-card-elevated p-3">
            <div className="text-[11px] uppercase tracking-[0.22em] text-secondary">{L.netBalance}</div>
            <div className={cn("font-display num mt-1 text-4xl", summary.netCents >= 0 ? "text-primary" : "text-destructive")}>
              {money.format(summary.netCents)}
            </div>
            <div className="num mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm">
              <span className="text-emerald-600 dark:text-emerald-400">{L.income}: {money.format(summary.incomeCents)}</span>
              <span className="text-destructive">{L.expense}: {money.format(summary.expenseCents)}</span>
            </div>
          </section>
          <AetherisInsightCard month={month} />
          <GoalsPanel />

          {/* Lives here (not in the Evolution card) so the two columns' total
              height stays reasonably balanced — the chart + categories side
              was running much taller than stats + goals alone. Bounded like
              GoalsPanel/CategoriesPanel so its own bottom lines up with
              Categories' bottom on the right, instead of ending wherever the
              transaction count happens to land. */}
          <section className="flex max-h-[456px] flex-col overflow-hidden rounded-xl border border-border/70 bg-surface-veil/40">
            <header className="flex shrink-0 items-center gap-2 px-3.5 pb-2 pt-3">
              <Receipt className="h-4 w-4 text-secondary" />
              <h2 className="font-display text-lg text-primary">{L.recentTransactions}</h2>
              <Link to="/transactions" className="ml-auto text-xs text-secondary hover:underline">{L.viewAll}</Link>
            </header>
            <div className="vault-rule mx-3.5 shrink-0" />
            {recent.length === 0 ? (
              <p className="p-8 text-center text-sm text-muted-foreground">{L.noData}</p>
            ) : (
              <div className="overflow-y-auto p-2.5">
                {recent.map((tx) => {
                  const Icon = TYPE_ICON[tx.type];
                  const signed = tx.type === "income" ? tx.amountCents : tx.type === "expense" ? -tx.amountCents : 0;
                  return (
                    <div key={tx.id} className="flex items-center gap-2 rounded-lg px-1 py-1.5 text-sm">
                      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="flex-1 truncate text-card-foreground">{tx.description || t.pluto.transactions.uncategorized}</span>
                      <span className={cn("num shrink-0", signed > 0 ? "text-emerald-600 dark:text-emerald-400" : signed < 0 ? "text-destructive" : "text-muted-foreground")}>
                        {signed === 0 ? money.format(tx.amountCents) : money.format(signed)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Right column — evolution chart + categories */}
        <div className="flex flex-col gap-3 lg:col-span-3">
          <section className="pluto-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-lg text-primary">{L.evolution}</h2>
              <MonthStepper month={month} onChange={setMonth} />
            </div>
            <EvolutionChart points={evolutionPoints} />

            <div className="mt-3 border-t border-border pt-3">
              <h3 className="font-display text-sm text-primary">{L.topExpenses}</h3>
              {top5.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">{L.noData}</p>
              ) : (
                <div className="mt-2">
                  <TopExpensesChart items={top5} categoryName={categoryName} categoryColor={categoryColor} />
                </div>
              )}
            </div>
          </section>

          <CategoriesPanel />
        </div>
      </div>
    </div>
  );
}
