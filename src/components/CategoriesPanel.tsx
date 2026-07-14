import { useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Inbox as InboxIcon, PiggyBank, Plus } from "lucide-react";
import BudgetRow from "@/components/BudgetRow";
import CategoryDialog from "@/components/CategoryDialog";
import { Button } from "@/components/ui/button";
import { budgetStatus, currentYYYYMM } from "@/lib/ledger/service";
import { useLedger } from "@/lib/ledger/store";
import { useDateFormat, useMoneyFormat, useT } from "@/lib/i18n/I18nProvider";
import { cn } from "@/lib/utils";

/** Categories + triage, merged into one persistent view instead of two tabs
 *  (Inbox vs Limits) that showed the same category list in two unrelated
 *  visual languages — a horizontally-scrolling row of near-empty drop cards,
 *  and a separate budget-progress grid. Now: one fixed Inbox column (drag
 *  source) beside one responsive grid of category cards (drop targets) that
 *  also carry their real budget status when they have one. */
export default function CategoriesPanel() {
  const { data, categorizeTransactions } = useLedger();
  const money = useMoneyFormat();
  const fmt = useDateFormat();
  const t = useT();
  const L = t.pluto.budgets;
  const LT = t.pluto.triage;
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCategoryId, setOverCategoryId] = useState<string | null>(null);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const month = currentYYYYMM();

  const categories = data.categories.filter((c) => !c.archivedAt);
  const expenseCategories = categories.filter((c) => c.kind === "expense");
  const incomeCategories = categories.filter((c) => c.kind !== "expense");
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
        <PiggyBank className="h-4 w-4 text-secondary" />
        <h2 className="font-display text-lg text-primary">{t.pluto.dashboard.tabCategories}</h2>
        <Button size="sm" variant="outline" className="ml-auto h-7 text-xs" onClick={() => setCategoryDialogOpen(true)}>
          <Plus className="mr-1 h-3.5 w-3.5" /> {t.pluto.categories.newCategory}
        </Button>
      </div>

      {categories.length === 0 ? (
        <p className="pluto-card p-8 text-center text-sm text-muted-foreground">{LT.noCategoriesYet}</p>
      ) : (
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          <section className="flex w-full shrink-0 flex-col overflow-hidden rounded-xl border border-border/70 bg-surface-veil/40 lg:w-64">
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

          <div className="grid min-w-0 flex-1 grid-cols-1 gap-3">
            {expenseCategories.map((category) => {
              const status = statusByCategory.get(category.id);
              return (
                <BudgetRow
                  key={category.id}
                  category={category}
                  limitCents={status?.limitCents ?? 0}
                  spentCents={status?.spentCents ?? 0}
                  overBudget={status?.overBudget ?? false}
                  txCount={countByCategory.get(category.id) ?? 0}
                  isDropTarget={overCategoryId === category.id}
                  onDragOver={() => dragId && setOverCategoryId(category.id)}
                  onDragLeave={() => setOverCategoryId((c) => (c === category.id ? null : c))}
                  onDrop={() => handleDrop(category.id)}
                />
              );
            })}
            {incomeCategories.map((category) => (
              <div
                key={category.id}
                onDragOver={(e) => { if (dragId) { e.preventDefault(); setOverCategoryId(category.id); } }}
                onDragLeave={() => setOverCategoryId((c) => (c === category.id ? null : c))}
                onDrop={(e) => { e.preventDefault(); handleDrop(category.id); }}
                className={cn(
                  "pluto-card flex items-center gap-2.5 p-4 transition-colors",
                  overCategoryId === category.id && "border-secondary bg-secondary/10 ring-1 ring-secondary/40",
                )}
              >
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: category.color }} />
                <span className="min-w-0 flex-1 truncate font-medium text-primary">{category.name}</span>
                <span className="num shrink-0 text-[11px] text-muted-foreground/70">({countByCategory.get(category.id) ?? 0})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <CategoryDialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen} defaultKind="expense" />
    </div>
  );
}
