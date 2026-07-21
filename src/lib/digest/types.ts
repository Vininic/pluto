export type ReportCard =
  | { kind: "overBudget"; categoryId: string; overCents: number }
  | { kind: "goalNearDone"; goalId: string; progressPct: number }
  | { kind: "goalDeadlineSoon"; goalId: string; daysLeft: number; progressPct: number }
  | { kind: "spendingUp"; pctChange: number }
  | { kind: "spendingDown"; pctChange: number }
  | { kind: "uncategorizedPile"; count: number }
  | { kind: "netNegative"; amountCents: number }
  | { kind: "allClear" }
  // AI-narrated card — title/body come straight from the model instead of an
  // i18n template, and severity travels with the card itself since (unlike
  // every heuristic kind above) it isn't fixed per kind. See cardSeverity().
  | { kind: "ai"; title: string; body: string; severity: ReportCardSeverity };

export type ReportCardSeverity = "warning" | "insight" | "positive";

const HEURISTIC_CARD_SEVERITY: Record<Exclude<ReportCard["kind"], "ai">, ReportCardSeverity> = {
  overBudget: "warning",
  goalDeadlineSoon: "warning",
  netNegative: "warning",
  spendingUp: "insight",
  uncategorizedPile: "insight",
  goalNearDone: "positive",
  spendingDown: "positive",
  allClear: "positive",
};

export function cardSeverity(card: ReportCard): ReportCardSeverity {
  return card.kind === "ai" ? card.severity : HEURISTIC_CARD_SEVERITY[card.kind];
}

export interface Digest {
  month: string;
  generatedAt: string;
  cards: ReportCard[];
  /** Whether this run's cards came from the AI attempt or the deterministic
   *  fallback — surfaced in the UI (see DigestView-style badge) rather than
   *  left implicit, same as Chronos' digest. */
  generatedBy: "ai" | "heuristic";
}
