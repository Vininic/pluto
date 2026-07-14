import { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { format } from "date-fns";
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, CalendarDays, List, Plus, ScanLine, Search } from "lucide-react";
import StatementImportDialog from "@/components/StatementImportDialog";
import TransactionDialog from "@/components/TransactionDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { currentYYYYMM } from "@/lib/ledger/service";
import { useLedger } from "@/lib/ledger/store";
import type { Transaction } from "@/lib/ledger/types";
import { parseMoneyInput } from "@/lib/money";
import { useDateFormat, useMoneyFormat, useT } from "@/lib/i18n/I18nProvider";
import { cn } from "@/lib/utils";

const ALL = "__all__";
const UNCATEGORIZED = "__uncategorized__";

const TYPE_ICON = { income: ArrowDownLeft, expense: ArrowUpRight, transfer: ArrowLeftRight } as const;

export default function Transactions() {
  const { data, createTransaction } = useLedger();
  const money = useMoneyFormat();
  const fmt = useDateFormat();
  const t = useT();
  const L = t.pluto.transactions;

  const location = useLocation();
  const presetCategory = (location.state as { presetCategory?: string } | null)?.presetCategory;
  const [month, setMonth] = useState(currentYYYYMM());
  const [walletId, setWalletId] = useState(ALL);
  const [categoryId, setCategoryId] = useState(
    presetCategory === "uncategorized" ? UNCATEGORIZED : presetCategory ? presetCategory : ALL,
  );
  const [type, setType] = useState(ALL);
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState<{ open: boolean; transaction: Transaction | null }>({ open: false, transaction: null });
  const [importOpen, setImportOpen] = useState(false);
  const [quickDesc, setQuickDesc] = useState("");
  const [quickAmount, setQuickAmount] = useState("");
  const [view, setView] = useState<"list" | "calendar">("list");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const wallets = data.wallets.filter((w) => !w.archivedAt);
  const categories = data.categories.filter((c) => !c.archivedAt);

  const monthFiltered = useMemo(() => {
    return data.transactions
      .filter((tx) => tx.date.slice(0, 7) === month)
      .filter((tx) => walletId === ALL || tx.walletId === walletId || tx.transferToWalletId === walletId)
      .filter((tx) => categoryId === ALL || (categoryId === UNCATEGORIZED ? !tx.categoryId : tx.categoryId === categoryId))
      .filter((tx) => type === ALL || tx.type === type)
      .filter((tx) => !search.trim() || tx.description.toLowerCase().includes(search.trim().toLowerCase()))
      .sort((a, b) => (b.date + b.createdAt).localeCompare(a.date + a.createdAt));
  }, [data.transactions, month, walletId, categoryId, type, search]);

  // In calendar mode the list is the selected day only — never the whole month
  // stacked under the grid. No day selected ⇒ nothing (the calendar shows a hint).
  const filtered = useMemo(() => {
    if (view !== "calendar") return monthFiltered;
    if (!selectedDay) return [];
    return monthFiltered.filter((tx) => tx.date === selectedDay);
  }, [monthFiltered, view, selectedDay]);

  // Compact per-day net for a calendar cell: rounded reais, signed, no decimals.
  const compactNet = (cents: number) => `${cents >= 0 ? "+" : "−"}${Math.abs(Math.round(cents / 100))}`;

  const dayTotals = useMemo(() => {
    const map = new Map<string, { net: number; count: number }>();
    for (const tx of monthFiltered) {
      const signed = tx.type === "income" ? tx.amountCents : tx.type === "expense" ? -tx.amountCents : 0;
      const entry = map.get(tx.date) ?? { net: 0, count: 0 };
      entry.net += signed;
      entry.count += 1;
      map.set(tx.date, entry);
    }
    return map;
  }, [monthFiltered]);

  const selectedDayTotals = selectedDay ? dayTotals.get(selectedDay) : undefined;

  const calendarDays = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const firstWeekday = new Date(y, m - 1, 1).getDay();
    const cells: (string | null)[] = Array(firstWeekday).fill(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(`${month}-${String(d).padStart(2, "0")}`);
    return cells;
  }, [month]);

  function quickAdd() {
    const amountCents = parseMoneyInput(quickAmount);
    const wallet = walletId !== ALL ? walletId : wallets[0]?.id;
    if (!amountCents || amountCents <= 0 || !wallet || !quickDesc.trim()) return;
    createTransaction({ walletId: wallet, type: "expense", amountCents, date: format(new Date(), "yyyy-MM-dd"), description: quickDesc.trim() });
    setQuickDesc("");
    setQuickAmount("");
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl text-primary">{L.title}</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <ScanLine className="mr-1.5 h-4 w-4" /> {t.pluto.statementImport.trigger}
          </Button>
          <Button className="bg-primary text-primary-foreground hover:bg-primary-deep" onClick={() => setDialog({ open: true, transaction: null })}>
            <Plus className="mr-1.5 h-4 w-4" /> {L.newTransaction}
          </Button>
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        <Input type="month" value={month} onChange={(e) => { setMonth(e.target.value); setSelectedDay(null); }} className="w-auto" aria-label={L.filterMonth} />
        <div className="flex items-center gap-0.5 rounded-full border border-border bg-card p-1">
          <button
            type="button"
            onClick={() => setView("list")}
            className={cn("grid h-7 w-7 place-items-center rounded-full transition-colors", view === "list" ? "bg-secondary/15 text-secondary" : "text-muted-foreground hover:bg-muted hover:text-primary")}
            title={L.viewList}
          >
            <List className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setView("calendar")}
            className={cn("grid h-7 w-7 place-items-center rounded-full transition-colors", view === "calendar" ? "bg-secondary/15 text-secondary" : "text-muted-foreground hover:bg-muted hover:text-primary")}
            title={L.viewCalendar}
          >
            <CalendarDays className="h-4 w-4" />
          </button>
        </div>
        <Select value={walletId} onValueChange={setWalletId}>
          <SelectTrigger className="w-auto min-w-[9rem]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{L.allWallets}</SelectItem>
            {wallets.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger className="w-auto min-w-[9rem]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{L.allCategories}</SelectItem>
            <SelectItem value={UNCATEGORIZED}>{L.uncategorized}</SelectItem>
            {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-auto min-w-[9rem]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{L.allTypes}</SelectItem>
            <SelectItem value="income">{L.income}</SelectItem>
            <SelectItem value="expense">{L.expense}</SelectItem>
            <SelectItem value="transfer">{L.transfer}</SelectItem>
          </SelectContent>
        </Select>
        <div className="relative min-w-[12rem] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={L.searchPlaceholder} className="pl-8" />
        </div>
      </div>

      <div className="pluto-card flex items-center gap-2 p-2">
        <Input
          value={quickDesc}
          onChange={(e) => setQuickDesc(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") quickAdd(); }}
          placeholder={L.quickAddPlaceholder}
          className="h-9 flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0"
        />
        <Input
          value={quickAmount}
          onChange={(e) => setQuickAmount(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") quickAdd(); }}
          placeholder="0,00"
          inputMode="decimal"
          className="h-9 w-28 border-0 bg-transparent text-right shadow-none focus-visible:ring-0"
        />
        <Button size="sm" variant="ghost" onClick={quickAdd} disabled={!quickDesc.trim() || !quickAmount.trim()}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {view === "calendar" && (
        <div className="pluto-card p-4">
          <div className="grid grid-cols-7 gap-1.5">
            {calendarDays.map((day, i) => {
              if (!day) return <div key={`empty-${i}`} />;
              const totals = dayTotals.get(day);
              const dayNum = Number(day.slice(-2));
              const isSelected = selectedDay === day;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedDay((d) => (d === day ? null : day))}
                  className={cn(
                    "flex aspect-square flex-col items-center justify-center gap-0.5 rounded-lg border text-xs transition-colors",
                    isSelected ? "border-secondary bg-secondary/15" : "border-transparent hover:bg-muted",
                    totals && !isSelected && (totals.net >= 0 ? "bg-emerald-500/10" : "bg-destructive/10"),
                  )}
                >
                  <span className="num text-card-foreground">{dayNum}</span>
                  {totals ? (
                    <span className={cn("num text-[10px] font-medium leading-none", totals.net >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>
                      {compactNet(totals.net)}
                    </span>
                  ) : (
                    <span className="h-[10px]" />
                  )}
                  {totals && totals.count > 0 && <span className="num text-[9px] text-muted-foreground leading-none">{totals.count}×</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {view === "calendar" && selectedDay && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <div className="flex items-baseline gap-3">
            <span className="text-sm font-medium capitalize text-card-foreground">{fmt.long(new Date(`${selectedDay}T00:00:00`))}</span>
            {selectedDayTotals && (
              <span className={cn("num text-sm font-medium", selectedDayTotals.net >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>
                {L.dayBalance}: {money.format(selectedDayTotals.net)}
              </span>
            )}
          </div>
          <button type="button" onClick={() => setSelectedDay(null)} className="text-xs text-secondary hover:underline">
            {L.backToMonth}
          </button>
        </div>
      )}

      {view === "calendar" && !selectedDay ? (
        <p className="pluto-card p-8 text-center text-sm text-muted-foreground">{L.calendarHint}</p>
      ) : filtered.length === 0 ? (
        <p className="pluto-card p-8 text-center text-sm text-muted-foreground">{L.empty}</p>
      ) : (
        <div className="pluto-card divide-y divide-border overflow-hidden">
          {filtered.map((tx) => {
            const wallet = data.wallets.find((w) => w.id === tx.walletId);
            const category = data.categories.find((c) => c.id === tx.categoryId);
            const toWallet = tx.transferToWalletId ? data.wallets.find((w) => w.id === tx.transferToWalletId) : undefined;
            const Icon = TYPE_ICON[tx.type];
            const signed = tx.type === "income" ? tx.amountCents : tx.type === "expense" ? -tx.amountCents : 0;
            return (
              <button
                key={tx.id}
                type="button"
                onClick={() => setDialog({ open: true, transaction: tx })}
                className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-muted/50"
              >
                <div
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full"
                  style={{ background: category ? `${category.color}22` : "hsl(var(--muted))", color: category?.color ?? "hsl(var(--muted-foreground))" }}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-card-foreground">{tx.description || L.uncategorized}</div>
                  <div className="num text-[11px] text-muted-foreground">
                    {fmt.short(tx.date)} · {wallet?.name}
                    {toWallet ? ` → ${toWallet.name}` : category ? ` · ${category.name}` : ` · ${L.uncategorized}`}
                  </div>
                </div>
                <div className={cn("num shrink-0 text-sm font-medium", signed > 0 ? "text-emerald-600 dark:text-emerald-400" : signed < 0 ? "text-destructive" : "text-muted-foreground")}>
                  {signed === 0 ? money.format(tx.amountCents) : money.format(signed)}
                </div>
              </button>
            );
          })}
        </div>
      )}

      <TransactionDialog open={dialog.open} onOpenChange={(open) => setDialog((s) => ({ ...s, open }))} transaction={dialog.transaction} />
      <StatementImportDialog open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}
