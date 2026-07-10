import { useState } from "react";
import { Download, FileSpreadsheet, FileText, Loader2, Mail, Sparkles } from "lucide-react";
import CategoryRankBars from "@/components/charts/CategoryRankBars";
import MonthStepper from "@/components/MonthStepper";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { buildReport } from "@/lib/reports/generate";
import { buildReportEmailHtml } from "@/lib/reports/emailTemplate";
import { sendReportEmail } from "@/lib/reports/mailer";
import { generateNarrative } from "@/lib/reports/narrative";
import { queueMonthlyReportEmail } from "@/lib/reports/outbox";
import { loadReports, updateReport, upsertReport } from "@/lib/reports/store";
import type { Report } from "@/lib/reports/types";
import { exportReportToXlsx } from "@/lib/reports/xlsx";
import { currentYYYYMM } from "@/lib/ledger/service";
import { useLedger } from "@/lib/ledger/store";
import { useDateFormat, useMoneyFormat, useT } from "@/lib/i18n/I18nProvider";
import { cn } from "@/lib/utils";

export default function Reports() {
  const { data } = useLedger();
  const money = useMoneyFormat();
  const fmt = useDateFormat();
  const t = useT();
  const L = t.pluto.reports;

  const [reports, setReports] = useState<Report[]>(loadReports);
  const [month, setMonth] = useState(reports[0]?.month ?? currentYYYYMM());
  const [narrativeLoading, setNarrativeLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [scheduling, setScheduling] = useState(false);

  const selected = reports.find((r) => r.month === month) ?? null;

  function generate() {
    const report = buildReport(data, month);
    setReports(upsertReport(report));
  }

  async function narrate() {
    if (!selected) return;
    setNarrativeLoading(true);
    try {
      const narrative = await generateNarrative(data, selected);
      setReports(updateReport(selected.id, { narrative }));
    } catch (err) {
      toast(L.narrativeFailed, { description: err instanceof Error ? err.message : undefined });
    } finally {
      setNarrativeLoading(false);
    }
  }

  async function sendNow() {
    if (!selected) return;
    setSending(true);
    try {
      const html = buildReportEmailHtml(data, selected, {
        netBalance: L.netBalance, income: t.pluto.dashboard.income, expense: t.pluto.dashboard.expense,
        categoryTable: L.categoryTable, budgetReview: L.budgetReview, goalsDelta: L.goalsDelta,
        uncategorized: t.pluto.transactions.uncategorized,
      });
      const err = await sendReportEmail(L.emailSubject(selected.month), html);
      if (err) {
        toast(L.sendFailed, { description: err });
      } else {
        setReports(updateReport(selected.id, { sentAt: new Date().toISOString() }));
        toast(L.sentAt(fmt.medium(new Date().toISOString().slice(0, 10))));
      }
    } finally {
      setSending(false);
    }
  }

  async function scheduleMonthly() {
    if (!selected) return;
    setScheduling(true);
    try {
      const html = buildReportEmailHtml(data, selected, {
        netBalance: L.netBalance, income: t.pluto.dashboard.income, expense: t.pluto.dashboard.expense,
        categoryTable: L.categoryTable, budgetReview: L.budgetReview, goalsDelta: L.goalsDelta,
        uncategorized: t.pluto.transactions.uncategorized,
      });
      const err = await queueMonthlyReportEmail(L.emailSubject(selected.month), { html, month: selected.month });
      if (err) {
        toast(L.scheduleFailed, { description: err });
      } else {
        setReports(updateReport(selected.id, { scheduledAt: new Date().toISOString() }));
        toast(L.scheduled);
      }
    } finally {
      setScheduling(false);
    }
  }

  function exportJson() {
    if (!selected) return;
    const blob = new Blob([JSON.stringify(selected, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pluto-report-${selected.month}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function exportXlsx() {
    if (!selected) return;
    await exportReportToXlsx(data, selected, {
      sheetReport: L.xlsxSheetReport, sheetCategories: L.xlsxSheetCategories, sheetGoals: L.xlsxSheetGoals, sheetMetadata: L.xlsxSheetMetadata,
      month: L.month, netBalance: L.netBalance, income: t.pluto.dashboard.income, expense: t.pluto.dashboard.expense,
      narrative: L.narrative, category: t.pluto.transactions.category, budgetLimit: L.limitColumn, overBudget: L.overColumn,
      goal: t.pluto.goals.title, target: t.pluto.goals.target, contributed: t.pluto.goals.contributed, progress: t.pluto.goals.progress,
      deltaThisMonth: L.deltaColumn, generatedAt: L.generatedAt, uncategorized: t.pluto.transactions.uncategorized,
    });
  }

  const categoryName = (id: string | null) => (id ? data.categories.find((c) => c.id === id)?.name ?? t.pluto.transactions.uncategorized : t.pluto.transactions.uncategorized);
  const categoryColor = (id: string | null) => (id ? data.categories.find((c) => c.id === id)?.color : undefined) ?? "hsl(var(--muted-foreground))";
  const pctChange = selected && selected.prevNetCents !== 0 ? Math.round(((selected.netCents - selected.prevNetCents) / Math.abs(selected.prevNetCents)) * 100) : null;
  const budgetByCategory = selected ? new Map(selected.budgets.map((b) => [b.categoryId, b])) : new Map<string | null, Report["budgets"][number]>();
  const rankItems = selected ? selected.categories.filter((c) => c.expenseCents > 0).map((c) => ({ name: categoryName(c.categoryId), valueCents: c.expenseCents, color: categoryColor(c.categoryId) })) : [];

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-secondary">{L.eyebrow}</div>
          <h1 className="font-display mt-1.5 text-4xl text-primary">{L.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <MonthStepper month={month} onChange={setMonth} />
          <Button onClick={generate} className="bg-primary text-primary-foreground hover:bg-primary-deep">
            <FileText className="mr-1.5 h-4 w-4" /> {selected ? L.regenerate : L.generate}
          </Button>
        </div>
      </header>

      {reports.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {reports.map((r) => (
            <button
              key={r.id}
              onClick={() => setMonth(r.month)}
              className={cn(
                "num rounded-full border px-3 py-1 text-xs transition-colors",
                r.month === month ? "border-secondary bg-secondary/10 text-primary" : "border-border text-muted-foreground hover:text-primary",
              )}
            >
              {r.month}
            </button>
          ))}
        </div>
      )}

      {!selected ? (
        <p className="pluto-card p-8 text-center text-sm text-muted-foreground">{L.empty}</p>
      ) : (
        <div className="space-y-6">
          <section className="pluto-card-elevated p-6">
            <div className="text-[11px] uppercase tracking-[0.22em] text-secondary">{L.netBalance}</div>
            <div className={cn("font-display num mt-1 text-4xl", selected.netCents >= 0 ? "text-primary" : "text-destructive")}>
              {money.format(selected.netCents)}
            </div>
            <div className="num mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span>{t.pluto.dashboard.income}: {money.format(selected.incomeCents)}</span>
              <span>{t.pluto.dashboard.expense}: {money.format(selected.expenseCents)}</span>
              {pctChange !== null && <span className={pctChange >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}>{L.vsLastMonth(pctChange)}</span>}
            </div>
          </section>

          <section className="pluto-card p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg text-primary">{L.narrative}</h2>
              <Button size="sm" variant="outline" onClick={() => void narrate()} disabled={narrativeLoading}>
                {narrativeLoading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1.5 h-3.5 w-3.5" />}
                {narrativeLoading ? L.generatingNarrative : L.generateNarrative}
              </Button>
            </div>
            {selected.narrative && <p className="mt-3 border-l-2 border-secondary/50 pl-3 text-sm leading-relaxed text-card-foreground">{selected.narrative}</p>}
          </section>

          {rankItems.length > 0 && (
            <section className="pluto-card p-5">
              <h2 className="font-display text-lg text-primary">{t.pluto.dashboard.topExpenses}</h2>
              <div className="mt-3">
                <CategoryRankBars items={rankItems} />
              </div>
            </section>
          )}

          <section className="pluto-card overflow-hidden p-0">
            <h2 className="font-display px-5 pt-5 text-lg text-primary">{L.categoryTable}</h2>
            <div className="mt-3 divide-y divide-border">
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 px-5 py-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                <span>{t.pluto.transactions.category}</span>
                <span className="text-right">{t.pluto.dashboard.income}</span>
                <span className="text-right">{t.pluto.dashboard.expense}</span>
                <span className="text-right">{L.limitColumn}</span>
              </div>
              {selected.categories.map((c) => {
                const budget = budgetByCategory.get(c.categoryId);
                return (
                  <div key={c.categoryId ?? "none"} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 px-5 py-2 text-sm">
                    <span className="flex min-w-0 items-center gap-2 truncate text-card-foreground">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: categoryColor(c.categoryId) }} />
                      <span className="truncate">{categoryName(c.categoryId)}</span>
                    </span>
                    <span className="num text-right text-emerald-600 dark:text-emerald-400">{c.incomeCents > 0 ? money.format(c.incomeCents) : "—"}</span>
                    <span className="num text-right text-muted-foreground">{c.expenseCents > 0 ? money.format(c.expenseCents) : "—"}</span>
                    <span className={cn("num text-right", budget?.overBudget ? "font-medium text-destructive" : "text-muted-foreground")}>
                      {budget ? money.format(budget.limitCents) : "—"}
                    </span>
                  </div>
                );
              })}
            </div>
            {selected.budgets.length === 0 && <p className="px-5 py-3 text-xs text-muted-foreground">{L.noBudgets}</p>}
            <div className="h-2" />
          </section>

          <section className="pluto-card p-5">
            <h2 className="font-display text-lg text-primary">{L.goalsDelta}</h2>
            {selected.goals.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">{L.noGoals}</p>
            ) : (
              <div className="mt-3 space-y-1.5">
                {selected.goals.map((g) => {
                  const goal = data.goals.find((gg) => gg.id === g.goalId);
                  return (
                    <div key={g.goalId} className="flex items-center justify-between text-sm">
                      <span className="text-card-foreground">{goal?.name ?? g.goalId}</span>
                      <span className="num text-muted-foreground">
                        {money.format(g.contributedCents)} / {money.format(g.targetCents)} ({g.progressPct}%)
                        {g.deltaCentsThisMonth > 0 && <span className="text-emerald-600 dark:text-emerald-400"> · +{money.format(g.deltaCentsThisMonth)} {L.thisMonth}</span>}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => void sendNow()} disabled={sending}>
              {sending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Mail className="mr-1.5 h-4 w-4" />}
              {sending ? L.sending : L.sendNow}
            </Button>
            <Button variant="outline" onClick={() => void scheduleMonthly()} disabled={scheduling}>
              {scheduling ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1.5 h-4 w-4" />}
              {L.scheduleMonthly}
            </Button>
            <Button variant="outline" onClick={exportJson}>
              <Download className="mr-1.5 h-4 w-4" /> {L.exportJson}
            </Button>
            <Button variant="outline" onClick={() => void exportXlsx()}>
              <FileSpreadsheet className="mr-1.5 h-4 w-4" /> {L.exportXlsx}
            </Button>
            {selected.sentAt && <span className="text-[11px] text-muted-foreground">{L.sentAt(fmt.medium(selected.sentAt.slice(0, 10)))}</span>}
            {selected.scheduledAt && <span className="text-[11px] text-muted-foreground">{L.scheduled}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
