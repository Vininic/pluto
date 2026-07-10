/** Pluto domain — a personal ledger: wallets hold money, transactions move it,
 *  budgets and goals give it direction. All money in **integer cents** (BRL) —
 *  never floats, never floating-point drift. */

export const LEDGER_VERSION = 1;

export const WALLET_TYPES = ["cash", "checking", "savings", "credit", "crypto"] as const;
export type WalletType = (typeof WALLET_TYPES)[number];

export const CATEGORY_KINDS = ["income", "expense"] as const;
export type CategoryKind = (typeof CATEGORY_KINDS)[number];

export const TRANSACTION_TYPES = ["income", "expense", "transfer"] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const TRANSACTION_SOURCES = ["manual", "ai-import"] as const;
export type TransactionSource = (typeof TRANSACTION_SOURCES)[number];

export const GOAL_HORIZONS = ["short", "long"] as const;
export type GoalHorizon = (typeof GOAL_HORIZONS)[number];

export const DEFAULT_WALLET_COLOR = "#C49A3A";
export const DEFAULT_CATEGORY_COLOR = "#5E6B77";
export const DEFAULT_GOAL_COLOR = "#C49A3A";

export interface Wallet {
  id: string;
  name: string;
  type: WalletType;
  color: string;
  createdAt: string;
  archivedAt?: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  kind: CategoryKind;
  createdAt: string;
  archivedAt?: string;
}

export interface Transaction {
  id: string;
  walletId: string;
  /** Undefined = "to triage" — arrives uncategorized, resolved on the Triage board. */
  categoryId?: string;
  type: TransactionType;
  amountCents: number;
  /** "yyyy-MM-dd" — ISO date strings compare lexically. */
  date: string;
  description: string;
  notes?: string;
  /** Destination wallet; set only when type === "transfer". */
  transferToWalletId?: string;
  source: TransactionSource;
  importBatchId?: string;
  createdAt: string;
  updatedAt: string;
}

/** A recurring monthly ceiling for one expense category — not tied to a
 *  specific month; `budgetStatus(data, yyyyMM)` compares it against whatever
 *  month is asked for. One budget per category. */
export interface Budget {
  id: string;
  categoryId: string;
  monthCents: number;
}

export interface GoalItem {
  id: string;
  name: string;
  priceCents: number;
  done: boolean;
  url?: string;
}

export interface Goal {
  id: string;
  name: string;
  horizon: GoalHorizon;
  targetCents: number;
  deadline?: string;
  color: string;
  items: GoalItem[];
  createdAt: string;
  archivedAt?: string;
}

export interface Contribution {
  id: string;
  goalId: string;
  amountCents: number;
  date: string;
  walletId?: string;
}

export interface LedgerData {
  meta: { version: number; currency: "BRL" };
  wallets: Wallet[];
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  goals: Goal[];
  contributions: Contribution[];
}

export function emptyLedger(): LedgerData {
  return {
    meta: { version: LEDGER_VERSION, currency: "BRL" },
    wallets: [],
    categories: [],
    transactions: [],
    budgets: [],
    goals: [],
    contributions: [],
  };
}

export function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
