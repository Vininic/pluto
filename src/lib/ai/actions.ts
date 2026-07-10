/** Aetheris ⇄ ledger protocol.
 *
 *  Provider-agnostic function calling: the system prompt teaches the model to
 *  emit a fenced ```actions block of JSON operations alongside its prose. We
 *  parse, validate against the domain, and apply through the same pure
 *  service the UI uses — with user confirmation unless autonomy is "auto".
 *  Every action here is one from PLUTO.md's AI section vocabulary.
 */
import {
  addContribution,
  addGoalItem,
  categorizeTransactions,
  createCategory,
  createGoal,
  createTransaction,
  createWallet,
  setBudget,
} from "@/lib/ledger/service";
import {
  CATEGORY_KINDS,
  GOAL_HORIZONS,
  TRANSACTION_TYPES,
  WALLET_TYPES,
  type Category,
  type CategoryKind,
  type Goal,
  type GoalHorizon,
  type LedgerData,
  type TransactionType,
  type Wallet,
  type WalletType,
} from "@/lib/ledger/types";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { brl } from "./format";

interface TransactionSpec {
  wallet: string;
  category?: string;
  txType: TransactionType;
  amountCents: number;
  date: string;
  description: string;
  transferTo?: string;
}

export type AetherisAction =
  | { type: "create_wallet"; name: string; walletType?: WalletType; color?: string }
  | { type: "create_category"; name: string; kind: CategoryKind; color?: string }
  | ({ type: "add_transaction" } & TransactionSpec)
  | { type: "add_transactions"; transactions: TransactionSpec[] }
  | { type: "categorize"; transactionIds: string[]; category: string }
  | { type: "set_budget"; category: string; monthCents: number }
  | { type: "create_goal"; name: string; horizon?: GoalHorizon; targetCents?: number; deadline?: string }
  | { type: "add_goal_item"; goal: string; name: string; priceCents: number; url?: string }
  | { type: "contribute_to_goal"; goal: string; amountCents: number; date: string; wallet?: string };

const ACTION_TYPES = [
  "create_wallet", "create_category", "add_transaction", "add_transactions",
  "categorize", "set_budget", "create_goal", "add_goal_item", "contribute_to_goal",
];

/** Split a model reply into prose and validated actions. Invalid entries are
 *  dropped rather than failing the whole block. */
export function parseActions(reply: string): { prose: string; actions: AetherisAction[] } {
  const match = reply.match(/```actions\s*([\s\S]*?)```/);
  if (!match) return { prose: reply.trim(), actions: [] };
  const prose = reply.replace(match[0], "").trim();
  let raw: unknown;
  try {
    raw = JSON.parse(match[1]);
  } catch {
    return { prose, actions: [] };
  }
  if (!Array.isArray(raw)) return { prose, actions: [] };
  const actions = raw.filter(
    (a): a is AetherisAction =>
      !!a && typeof a === "object" && ACTION_TYPES.includes((a as { type?: string }).type ?? ""),
  );
  return { prose, actions };
}

export function findWallet(data: LedgerData, ref: string): Wallet | undefined {
  return data.wallets.find((w) => w.id === ref) ?? data.wallets.find((w) => w.name.toLowerCase() === ref.toLowerCase());
}

export function findCategory(data: LedgerData, ref: string): Category | undefined {
  return data.categories.find((c) => c.id === ref) ?? data.categories.find((c) => c.name.toLowerCase() === ref.toLowerCase());
}

export function findGoal(data: LedgerData, ref: string): Goal | undefined {
  return data.goals.find((g) => g.id === ref) ?? data.goals.find((g) => g.name.toLowerCase() === ref.toLowerCase());
}

const clampWalletType = (t?: string) => (t && (WALLET_TYPES as readonly string[]).includes(t) ? (t as WalletType) : undefined);
const clampCategoryKind = (k?: string) => ((k && (CATEGORY_KINDS as readonly string[]).includes(k) ? k : "expense") as CategoryKind);
const clampTxType = (t?: string) => ((t && (TRANSACTION_TYPES as readonly string[]).includes(t) ? t : "expense") as TransactionType);
const clampHorizon = (h?: string) => (h && (GOAL_HORIZONS as readonly string[]).includes(h) ? (h as GoalHorizon) : undefined);

/** One add_transaction (or one entry of an add_transactions batch) applied
 *  against a wallet/category already resolved to ids. Returns the new
 *  ledger or an error string. */
function applyTransactionSpec(data: LedgerData, spec: TransactionSpec): LedgerData | string {
  const wallet = findWallet(data, spec.wallet);
  if (!wallet) return `No wallet matches "${spec.wallet}"`;
  const txType = clampTxType(spec.txType);
  let categoryId: string | undefined;
  if (spec.category) {
    const category = findCategory(data, spec.category);
    if (!category) return `No category matches "${spec.category}"`;
    categoryId = category.id;
  }
  let transferToWalletId: string | undefined;
  if (txType === "transfer") {
    if (!spec.transferTo) return "add_transaction with txType=transfer needs transferTo";
    const to = findWallet(data, spec.transferTo);
    if (!to) return `No wallet matches "${spec.transferTo}"`;
    transferToWalletId = to.id;
  }
  if (!spec.amountCents || spec.amountCents <= 0) return "add_transaction needs a positive amountCents";
  return createTransaction(data, {
    walletId: wallet.id,
    categoryId,
    type: txType,
    amountCents: spec.amountCents,
    date: spec.date,
    description: spec.description ?? "",
    transferToWalletId,
    source: "ai-import",
  }).data;
}

/** Apply one action; returns the new ledger or an error string. */
export function applyAction(data: LedgerData, action: AetherisAction): LedgerData | string {
  switch (action.type) {
    case "create_wallet": {
      if (!action.name?.trim()) return "create_wallet needs a name";
      return createWallet(data, { name: action.name, type: clampWalletType(action.walletType), color: action.color }).data;
    }
    case "create_category": {
      if (!action.name?.trim()) return "create_category needs a name";
      return createCategory(data, { name: action.name, kind: clampCategoryKind(action.kind), color: action.color }).data;
    }
    case "add_transaction":
      return applyTransactionSpec(data, action);
    case "add_transactions": {
      if (!action.transactions?.length) return "add_transactions needs at least one transaction";
      let next = data;
      for (const spec of action.transactions) {
        const result = applyTransactionSpec(next, spec);
        if (typeof result === "string") return result;
        next = result;
      }
      return next;
    }
    case "categorize": {
      if (!action.transactionIds?.length) return "categorize needs transactionIds";
      const category = findCategory(data, action.category);
      if (!category) return `No category matches "${action.category}"`;
      const valid = action.transactionIds.filter((id) => data.transactions.some((t) => t.id === id));
      if (valid.length === 0) return "None of the given transaction ids exist";
      return categorizeTransactions(data, valid, category.id);
    }
    case "set_budget": {
      const category = findCategory(data, action.category);
      if (!category) return `No category matches "${action.category}"`;
      if (typeof action.monthCents !== "number" || action.monthCents < 0) return "set_budget needs a non-negative monthCents";
      return setBudget(data, { categoryId: category.id, monthCents: action.monthCents }).data;
    }
    case "create_goal": {
      if (!action.name?.trim()) return "create_goal needs a name";
      return createGoal(data, { name: action.name, horizon: clampHorizon(action.horizon), targetCents: action.targetCents, deadline: action.deadline }).data;
    }
    case "add_goal_item": {
      const goal = findGoal(data, action.goal);
      if (!goal) return `No goal matches "${action.goal}"`;
      if (!action.name?.trim()) return "add_goal_item needs a name";
      return addGoalItem(data, goal.id, { name: action.name, priceCents: action.priceCents ?? 0, url: action.url }).data;
    }
    case "contribute_to_goal": {
      const goal = findGoal(data, action.goal);
      if (!goal) return `No goal matches "${action.goal}"`;
      if (!action.amountCents || action.amountCents <= 0) return "contribute_to_goal needs a positive amountCents";
      const walletId = action.wallet ? findWallet(data, action.wallet)?.id : undefined;
      if (action.wallet && !walletId) return `No wallet matches "${action.wallet}"`;
      return addContribution(data, goal.id, { amountCents: action.amountCents, date: action.date, walletId }).data;
    }
  }
}

/** One human-readable line per action, for the proposal cards — localized
 *  via the active dictionary rather than hardcoded English. */
export function describeAction(data: LedgerData, action: AetherisAction, P: Dictionary["pluto"]): string {
  const A = P.aetheris;
  switch (action.type) {
    case "create_wallet":
      return A.describeCreateWallet(action.name);
    case "create_category":
      return A.describeCreateCategory(action.name);
    case "add_transaction":
      return A.describeAddTransaction(action.description || action.wallet, brl(action.amountCents));
    case "add_transactions":
      return A.describeAddTransactions(action.transactions.length);
    case "categorize":
      return A.describeCategorize(action.transactionIds.length, action.category);
    case "set_budget":
      return A.describeSetBudget(findCategory(data, action.category)?.name ?? action.category);
    case "create_goal":
      return A.describeCreateGoal(action.name);
    case "add_goal_item":
      return A.describeAddGoalItem(action.name, findGoal(data, action.goal)?.name ?? action.goal);
    case "contribute_to_goal":
      return A.describeContributeToGoal(findGoal(data, action.goal)?.name ?? action.goal, brl(action.amountCents));
  }
}
