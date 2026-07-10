import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, LayoutDashboard, PiggyBank, Target } from "lucide-react";
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

type DashboardTab = "overview" | "categories" | "goals";

export default function Dashboard() {
  const { data } = useLedger();
  const money = useMoneyFormat();
  const t = useT();
  const L = t.pluto.dashboard;
  const [month, setMonth] = useState(currentYYYYMM());
  const [tab, setTab] = useState<DashboardTab>("overview");

  const summary = monthSummary(data, month);
  const top5 = topExpenses(data, month, 5);
  const recent = [...data.transactions].sort((a, b) => (b.date + b.createdAt).localeCompare(a.date + a.createdAt)).slice(0, 5);
  const evolutionPoints = evolution(data, 12, month);

  const categoryName = (id: string | null) => (id ? data.categories.find((c) => c.id === id)?.name ?? t.pluto.transactions.uncategorized : t.pluto.transactions.uncategorized);
  const categoryColor = (id: string | null) => (id ? data.categories.find((c) => c.id === id)?.color : undefined) ?? "hsl(var(--muted-foreground))";

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-secondary">{L.eyebrow}</div>
          <h1 className="font-display mt-1.5 text-4xl text-primary">{L.title}</h1>
        </div>
        <div className="flex gap-1">
          {(
            [
              { key: "overview" as const, label: L.tabOverview, icon: LayoutDashboard },
              { key: "categories" as const, label: L.tabCategories, icon: PiggyBank },
              { key: "goals" as const, label: L.tabGoals, icon: Target },
            ]
          ).map((tabDef) => (
            <button
              key={tabDef.key}
              type="button"
              onClick={() => setTab(tabDef.key)}
              className={cn(
                "flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider transition-colors",
                tab === tabDef.key
                  ? "border-secondary/40 bg-secondary/15 text-secondary"
                  : "border-transparent text-muted-foreground hover:border-secondary/20 hover:bg-secondary/5 hover:text-primary",
              )}
            >
              <tabDef.icon className="h-3 w-3" /> {tabDef.label}
            </button>
          ))}
        </div>
      </header>

      {tab === "overview" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <section className="pluto-card-elevated p-6">
              <div className="text-[11px] uppercase tracking-[0.22em] text-secondary">{L.netBalance}</div>
              <div className={cn("font-display num mt-1 text-4xl", summary.netCents >= 0 ? "text-primary" : "text-destructive")}>
                {money.format(summary.netCents)}
              </div>
              <div className="num mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
                <span className="text-emerald-600 dark:text-emerald-400">{L.income}: {money.format(summary.incomeCents)}</span>
                <span className="text-destructive">{L.expense}: {money.format(summary.expenseCents)}</span>
              </div>
            </section>

            <section className="pluto-card p-5 lg:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-display text-lg text-primary">{L.evolution}</h2>
                <MonthStepper month={month} onChange={setMonth} />
              </div>
              <EvolutionChart points={evolutionPoints} />
            </section>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <AetherisInsightCard month={month} />

            <section className="pluto-card p-5">
              <h2 className="font-display text-lg text-primary">{L.topExpenses}</h2>
              {top5.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">{L.noData}</p>
              ) : (
                <div className="mt-3">
                  <TopExpensesChart items={top5} categoryName={categoryName} categoryColor={categoryColor} />
                </div>
              )}
            </section>

            <section className="pluto-card p-5">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg text-primary">{L.recentTransactions}</h2>
                <Link to="/transactions" className="text-xs text-secondary hover:underline">{L.viewAll}</Link>
              </div>
              {recent.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">{L.noData}</p>
              ) : (
                <div className="mt-3 space-y-1">
                  {recent.map((tx) => {
                    const Icon = TYPE_ICON[tx.type];
                    const signed = tx.type === "income" ? tx.amountCents : tx.type === "expense" ? -tx.amountCents : 0;
                    return (
                      <div key={tx.id} className="flex items-center gap-2 py-1 text-sm">
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
        </div>
      )}

      {tab === "categories" && <CategoriesPanel />}
      {tab === "goals" && <GoalsPanel />}
    </div>
  );
}
