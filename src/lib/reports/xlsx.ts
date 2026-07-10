/** Formatted XLSX export — same ExcelJS pattern as Chronos'
 *  lib/schedule/export.ts and Kairos' lib/board/xlsx.ts (identical
 *  THIN/HEADER_FILL/HEADER_FONT/styleHeaderRow/readableText helpers), so a
 *  Pluto report downloads looking like the rest of the suite's exports
 *  instead of a plain unstyled sheet. No React deps — labels are passed in
 *  from the page, same convention as emailTemplate.ts. ExcelJS itself is
 *  ~900KB — dynamically imported so it only loads when someone actually
 *  clicks "Export XLSX", instead of bloating every page's initial bundle. */
import type ExcelJS from "exceljs";
import { brl } from "@/lib/ai/format";
import type { LedgerData } from "@/lib/ledger/types";
import type { Report } from "./types";

export interface XlsxLabels {
  sheetReport: string;
  sheetCategories: string;
  sheetGoals: string;
  sheetMetadata: string;
  month: string;
  netBalance: string;
  income: string;
  expense: string;
  narrative: string;
  category: string;
  budgetLimit: string;
  overBudget: string;
  goal: string;
  target: string;
  contributed: string;
  progress: string;
  deltaThisMonth: string;
  generatedAt: string;
  uncategorized: string;
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const THIN = { style: "thin" as const, color: { argb: "FFD9D9D9" } };
const HEADER_FILL = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FF1F2937" } };
const HEADER_FONT = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };

function styleHeaderRow(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = { top: THIN, bottom: THIN, left: THIN, right: THIN };
  });
}

function readableText(hex6: string): string {
  const r = parseInt(hex6.slice(0, 2), 16), g = parseInt(hex6.slice(2, 4), 16), b = parseInt(hex6.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.62 ? "FF1A1A1A" : "FFFFFFFF";
}

function argb(hex6: string) {
  return `FF${hex6}`;
}

function categoryHex(data: LedgerData, id: string | null): string {
  const cat = id ? data.categories.find((c) => c.id === id) : undefined;
  return (cat?.color ?? "#94a3b8").replace(/^#/, "").toLowerCase();
}

function categoryName(data: LedgerData, id: string | null, uncategorized: string): string {
  return id ? data.categories.find((c) => c.id === id)?.name ?? uncategorized : uncategorized;
}

export async function buildStyledWorkbook(data: LedgerData, report: Report, L: XlsxLabels): Promise<ExcelJS.Workbook> {
  const { default: ExcelJS } = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  wb.creator = "Pluto";
  wb.created = new Date();

  const reportSheet = wb.addWorksheet(L.sheetReport);
  reportSheet.columns = [{ header: "", key: "label", width: 22 }, { header: "", key: "value", width: 40 }];
  reportSheet.addRows([
    [L.month, report.month],
    [L.netBalance, brl(report.netCents)],
    [L.income, brl(report.incomeCents)],
    [L.expense, brl(report.expenseCents)],
    [L.generatedAt, new Date(report.generatedAt).toLocaleString()],
    [L.narrative, report.narrative ?? ""],
  ]);
  reportSheet.getColumn("label").font = { bold: true };

  const budgetByCategory = new Map(report.budgets.map((b) => [b.categoryId, b]));
  const catSheet = wb.addWorksheet(L.sheetCategories, { views: [{ state: "frozen", ySplit: 1 }] });
  catSheet.columns = [
    { header: L.category, key: "name", width: 24 },
    { header: L.income, key: "income", width: 16 },
    { header: L.expense, key: "expense", width: 16 },
    { header: L.budgetLimit, key: "limit", width: 16 },
    { header: L.overBudget, key: "over", width: 14 },
  ];
  styleHeaderRow(catSheet.getRow(1));
  for (const c of report.categories) {
    const budget = budgetByCategory.get(c.categoryId);
    const hex = categoryHex(data, c.categoryId);
    const row = catSheet.addRow({
      name: categoryName(data, c.categoryId, L.uncategorized),
      income: c.incomeCents / 100,
      expense: c.expenseCents / 100,
      limit: budget ? budget.limitCents / 100 : "",
      over: budget ? (budget.overBudget ? "Y" : "N") : "",
    });
    row.getCell("name").fill = { type: "pattern", pattern: "solid", fgColor: { argb: argb(hex) } };
    row.getCell("name").font = { color: { argb: readableText(hex) }, bold: true };
    row.getCell("income").numFmt = "R$ #,##0.00";
    row.getCell("expense").numFmt = "R$ #,##0.00";
    row.getCell("limit").numFmt = "R$ #,##0.00";
  }

  const goalsSheet = wb.addWorksheet(L.sheetGoals, { views: [{ state: "frozen", ySplit: 1 }] });
  goalsSheet.columns = [
    { header: L.goal, key: "name", width: 24 },
    { header: L.contributed, key: "contributed", width: 16 },
    { header: L.target, key: "target", width: 16 },
    { header: L.progress, key: "progress", width: 12 },
    { header: L.deltaThisMonth, key: "delta", width: 16 },
  ];
  styleHeaderRow(goalsSheet.getRow(1));
  for (const g of report.goals) {
    const goal = data.goals.find((gg) => gg.id === g.goalId);
    const row = goalsSheet.addRow({
      name: goal?.name ?? g.goalId,
      contributed: g.contributedCents / 100,
      target: g.targetCents / 100,
      progress: `${g.progressPct}%`,
      delta: g.deltaCentsThisMonth / 100,
    });
    row.getCell("contributed").numFmt = "R$ #,##0.00";
    row.getCell("target").numFmt = "R$ #,##0.00";
    row.getCell("delta").numFmt = "R$ #,##0.00";
  }

  const meta = wb.addWorksheet(L.sheetMetadata);
  meta.columns = [{ header: "", key: "k", width: 20 }, { header: "", key: "v", width: 30 }];
  meta.addRows([["PLUTO_XLSX_FORMAT", "1"], [L.month, report.month], [L.generatedAt, report.generatedAt]]);

  return wb;
}

export async function exportReportToXlsx(data: LedgerData, report: Report, labels: XlsxLabels, filename?: string) {
  const wb = await buildStyledWorkbook(data, report, labels);
  const buf = await wb.xlsx.writeBuffer();
  download(
    new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    filename ?? `pluto-report-${report.month}.xlsx`,
  );
}
