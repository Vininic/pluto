/** Log of Aetheris-applied ledger changes, for undo. Each entry keeps the
 *  ledger snapshot from just before it applied, so "Undo" is a plain restore
 *  rather than a per-action inverse — important here since actions touch
 *  real money records. */
import { makeId, type LedgerData } from "@/lib/ledger/types";

export interface HistoryEntry {
  id: string;
  timestamp: string;
  descriptions: string[];
  ledgerBefore: LedgerData;
  undone: boolean;
}

const KEY = "pluto.ai-history.v1";
const MAX_ENTRIES = 30;

export function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveHistory(entries: HistoryEntry[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch {
    /* storage full or unavailable — keep running in memory */
  }
}

export function logHistory(ledgerBefore: LedgerData, descriptions: string[]): HistoryEntry[] {
  const entry: HistoryEntry = { id: makeId(), timestamp: new Date().toISOString(), descriptions, ledgerBefore, undone: false };
  const next = [entry, ...loadHistory()];
  saveHistory(next);
  return next;
}

export function markUndone(id: string): HistoryEntry[] {
  const next = loadHistory().map((e) => (e.id === id ? { ...e, undone: true } : e));
  saveHistory(next);
  return next;
}
