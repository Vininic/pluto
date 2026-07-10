/** Report history — local-first, mirrors the chatSessions.ts pattern. One
 *  report per month; regenerating replaces the existing one for that month
 *  rather than piling up duplicates. */
import type { Report } from "./types";

const KEY = "pluto.reports.v1";
const MAX_REPORTS = 24;

export function loadReports(): Report[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as Report[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveReports(reports: Report[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(reports.slice(0, MAX_REPORTS)));
  } catch {
    /* storage full or unavailable — keep running in memory */
  }
}

/** Replace any existing report for the same month, then re-sort newest first. */
export function upsertReport(report: Report): Report[] {
  const next = [report, ...loadReports().filter((r) => r.month !== report.month)]
    .sort((a, b) => b.month.localeCompare(a.month))
    .slice(0, MAX_REPORTS);
  saveReports(next);
  return next;
}

export function updateReport(id: string, patch: Partial<Report>): Report[] {
  const next = loadReports().map((r) => (r.id === id ? { ...r, ...patch } : r));
  saveReports(next);
  return next;
}
