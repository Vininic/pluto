export type ReportCard =
  | { kind: "overBudget"; categoryId: string; overCents: number }
  | { kind: "goalNearDone"; goalId: string; progressPct: number }
  | { kind: "goalDeadlineSoon"; goalId: string; daysLeft: number; progressPct: number }
  | { kind: "spendingUp"; pctChange: number }
  | { kind: "spendingDown"; pctChange: number }
  | { kind: "uncategorizedPile"; count: number }
  | { kind: "netNegative"; amountCents: number }
  | { kind: "allClear" };

export type ReportCardSeverity = "warning" | "insight" | "positive";

export const CARD_SEVERITY: Record<ReportCard["kind"], ReportCardSeverity> = {
  overBudget: "warning",
  goalDeadlineSoon: "warning",
  netNegative: "warning",
  spendingUp: "insight",
  uncategorizedPile: "insight",
  goalNearDone: "positive",
  spendingDown: "positive",
  allClear: "positive",
};

export interface Digest {
  month: string;
  generatedAt: string;
  cards: ReportCard[];
}
