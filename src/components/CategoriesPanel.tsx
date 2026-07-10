import { useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Inbox as InboxIcon, Plus, SlidersHorizontal } from "lucide-react";
import BudgetRow from "@/components/BudgetRow";
import CategoryDialog from "@/components/CategoryDialog";
import { Button } from "@/components/ui/button";
import { budgetStatus, currentYYYYMM } from "@/lib/ledger/service";
import { useLedger } from "@/lib/ledger/store";
import { useDateFormat, useMoneyFormat, useT } from "@/lib/i18n/I18nProvider";
import { cn } from "@/lib/utils";

type Tab = "inbox" | "limits";

/** The Triage inbox board + per-category budget limits, merged into one tab
 *  pair since both operate on the same category list and both used to have
 *  their own "new category" entry point. Inline content — no Dialog chrome —
 *  meant to sit inside a Dashboard tab, not a modal. */
export default function CategoriesPanel() {
  const { data, categorizeTransactions } = useLedger();
  const money = useMoneyFormat();
  const fmt = useDateFormat();
  const t = useT();
  const L = t.pluto.budgets;
  const LT = t.pluto.triage;
  const [tab, setTab] = useState<Tab>("limits");
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCategoryId, setOverCategoryId] = useState<string | null>(null);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const month = currentYYYYMM();

  const categories = data.categories.filter((c) => !c.archivedAt);
  const expenseCategories = categories.filter((c) => c.kind === "expense");
  const statusByCategory = new Map(budgetStatus(data, month).map((s) => [s.categoryId, s]));

  const inbox = data.transactions
    .filter((tx) => !tx.categoryId && tx.type !== "transfer")
    .sort((a, b) => b.date.localeCompare(a.date));
  const countByCategory = new Map<string, number>();
  for (const tx of data.transactions) {
    if (tx.categoryId) countByCategory.set(tx.categoryId, (countByCategory.get(tx.categoryId) ?? 0) + 1);
  }

  function handleDrop(categoryId: string) {
    if (dragId) categorizeTransactions([dragId], categoryId);
    setDragId(null);
    setOverCategoryId(null);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex gap-1">
          {(
            [
              { key: "inbox" as const, label: L.tabInbox, icon: InboxIcon, badge: inbox.length },
              { key: "limits" as const, label: L.tabLimits, icon: SlidersHorizontal, badge: 0 },
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
              {tabDef.badge > 0 && <span className="num">({tabDef.badge})</span>}
            </button>
          ))}
        </div>
        <Button size="sm" variant="outline" className="ml-auto h-7 text-xs" onClick={() => setCategoryDialogOpen(true)}>
          <Plus className="mr-1 h-3.5 w-3.5" /> {t.pluto.categories.newCategory}
        </Button>
      </div>

      {tab === "inbox" ? (
        categories.length === 0 ? (
          <p className="pluto-card p-8 text-center text-sm text-muted-foreground">{LT.noCategoriesYet}</p>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2">
            <section className="flex w-64 shrink-0 flex-col overflow-hidden rounded-xl border border-border/70 bg-surface-veil/40">
              <header className="flex shrink-0 items-center gap-1.5 px-3 pb-1 pt-3">
                <InboxIcon className="h-3.5 w-3.5 text-secondary" />
                <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{LT.inbox}</h3>
                <span className="num ml-auto text-xs text-muted-foreground/70">{inbox.length}</span>
              </header>
              <div className="vault-rule mx-3 shrink-0" />
              <div className="flex max-h-96 min-h-0 flex-col gap-1.5 overflow-y-auto p-2">
                {inbox.length === 0 && <p className="p-4 text-center text-xs text-muted-foreground">{LT.empty}</p>}
                {inbox.map((tx) => {
                  const wallet = data.wallets.find((w) => w.id === tx.walletId);
                  const Icon = tx.type === "income" ? ArrowDownLeft : ArrowUpRight;
                  return (
                    <div
                      key={tx.id}
                      draggable
                      onDragStart={(e) => { e.dataTransfer.setData("text/plain", tx.id); e.dataTransfer.effectAllowed = "move"; setDragId(tx.id); }}
                      onDragEnd={() => { setDragId(null); setOverCategoryId(null); }}
                      className={cn("pluto-card cursor-grab p-3 active:cursor-grabbing", dragId === tx.id && "opacity-40")}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className={cn("h-3.5 w-3.5 shrink-0", tx.type === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")} />
                        <span className="truncate text-sm font-medium text-card-foreground">{tx.description || LT.inbox}</span>
                      </div>
                      <div className="num mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>{fmt.short(tx.date)} · {wallet?.name}</span>
                        <span className="font-medium text-card-foreground">{money.format(tx.amountCents)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {categories.map((category) => (
              <section
                key={category.id}
                onDragOver={(e) => { if (dragId) { e.preventDefault(); setOverCategoryId(category.id); } }}
                onDragLeave={() => setOverCategoryId((c) => (c === category.id ? null : c))}
                onDrop={(e) => { e.preventDefault(); handleDrop(category.id); }}
                className={cn(
                  "flex w-40 shrink-0 flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-border/70 bg-surface-veil/20 p-3 text-center transition-colors",
                  overCategoryId === category.id && "border-secondary bg-secondary/10",
                )}
              >
                <span className="h-3 w-3 rounded-full" style={{ background: category.color }} />
                <span className="truncate text-sm font-medium text-primary">{category.name}</span>
                <span className="num text-xs text-muted-foreground">{countByCategory.get(category.id) ?? 0}</span>
              </section>
            ))}
          </div>
        )
      ) : expenseCategories.length === 0 ? (
        <p className="pluto-card p-8 text-center text-sm text-muted-foreground">{L.empty}</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {expenseCategories.map((category) => {
            const status = statusByCategory.get(category.id);
            return (
              <BudgetRow
                key={category.id}
                category={category}
                limitCents={status?.limitCents ?? 0}
                spentCents={status?.spentCents ?? 0}
                overBudget={status?.overBudget ?? false}
              />
            );
          })}
        </div>
      )}

      <CategoryDialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen} defaultKind="expense" />
    </div>
  );
}
