import type { BudgetStatus, CategoryMonthTotal } from "@/lib/ledger/service";

export interface GoalReportRow {
  goalId: string;
  targetCents: number;
  contributedCents: number;
  progressPct: number;
  /** Contributions dated within this report's month specifically — the
   *  "goals delta" the page spec calls for, distinct from lifetime progress. */
  deltaCentsThisMonth: number;
}

export interface Report {
  id: string;
  /** "yyyy-MM" */
  month: string;
  generatedAt: string;
  incomeCents: number;
  expenseCents: number;
  netCents: number;
  prevNetCents: number;
  categories: CategoryMonthTotal[];
  budgets: BudgetStatus[];
  goals: GoalReportRow[];
  /** AI-generated prose section — optional, added after the deterministic
   *  aggregates already exist (heuristics-first, AI narrates second). */
  narrative?: string;
  sentAt?: string;
  scheduledAt?: string;
}
