/** Pure ledger operations. Every function takes LedgerData and returns a new
 *  one; the store is a thin React wrapper and the tests run against this file. */
import {
  CATEGORY_KINDS,
  DEFAULT_CATEGORY_COLOR,
  DEFAULT_GOAL_COLOR,
  DEFAULT_WALLET_COLOR,
  GOAL_HORIZONS,
  LEDGER_VERSION,
  TRANSACTION_TYPES,
  WALLET_TYPES,
  emptyLedger,
  makeId,
  type Budget,
  type Category,
  type CategoryKind,
  type Contribution,
  type Goal,
  type GoalHorizon,
  type GoalItem,
  type LedgerData,
  type Transaction,
  type TransactionSource,
  type TransactionType,
  type Wallet,
  type WalletType,
} from "./types";

const now = () => new Date().toISOString();
const monthOf = (date: string) => date.slice(0, 7);

export function currentYYYYMM(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** "2026-07" shifted by `delta` months (can be negative). */
export function shiftMonth(yyyyMM: string, delta: number): string {
  const [y, m] = yyyyMM.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/* ── Wallets ───────────────────────────────────────────────────────────────── */

export interface WalletInput {
  name: string;
  type?: WalletType;
  color?: string;
}

export function createWallet(data: LedgerData, input: WalletInput, id = makeId()): { data: LedgerData; id: string } {
  const wallet: Wallet = {
    id,
    name: input.name.trim() || "Untitled wallet",
    type: input.type && (WALLET_TYPES as readonly string[]).includes(input.type) ? input.type : "cash",
    color: input.color ?? DEFAULT_WALLET_COLOR,
    createdAt: now(),
  };
  return { data: { ...data, wallets: [...data.wallets, wallet] }, id };
}

export function updateWallet(data: LedgerData, id: string, patch: Partial<Pick<Wallet, "name" | "type" | "color" | "archivedAt">>): LedgerData {
  return { ...data, wallets: data.wallets.map((w) => (w.id === id ? { ...w, ...patch } : w)) };
}

export function archiveWallet(data: LedgerData, id: string): LedgerData {
  return updateWallet(data, id, { archivedAt: now() });
}

export function unarchiveWallet(data: LedgerData, id: string): LedgerData {
  return updateWallet(data, id, { archivedAt: undefined });
}

/** A wallet is deletable only when nothing references it — the cascade rule
 *  is archive, never silent-delete transactions. */
export function canDeleteWallet(data: LedgerData, walletId: string): boolean {
  const referenced = data.transactions.some((t) => t.walletId === walletId || t.transferToWalletId === walletId);
  const contributed = data.contributions.some((c) => c.walletId === walletId);
  return !referenced && !contributed;
}

/** No-op (data unchanged) when the wallet still has transactions or
 *  contributions — callers should archive instead. */
export function deleteWallet(data: LedgerData, id: string): LedgerData {
  if (!canDeleteWallet(data, id)) return data;
  return { ...data, wallets: data.wallets.filter((w) => w.id !== id) };
}

/* ── Categories ────────────────────────────────────────────────────────────── */

export interface CategoryInput {
  name: string;
  kind: CategoryKind;
  color?: string;
}

export function createCategory(data: LedgerData, input: CategoryInput, id = makeId()): { data: LedgerData; id: string } {
  const category: Category = {
    id,
    name: input.name.trim() || "Untitled category",
    kind: (CATEGORY_KINDS as readonly string[]).includes(input.kind) ? input.kind : "expense",
    color: input.color ?? DEFAULT_CATEGORY_COLOR,
    createdAt: now(),
  };
  return { data: { ...data, categories: [...data.categories, category] }, id };
}

export function updateCategory(data: LedgerData, id: string, patch: Partial<Pick<Category, "name" | "color" | "archivedAt">>): LedgerData {
  return { ...data, categories: data.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)) };
}

export function archiveCategory(data: LedgerData, id: string): LedgerData {
  return updateCategory(data, id, { archivedAt: now() });
}

export function unarchiveCategory(data: LedgerData, id: string): LedgerData {
  return updateCategory(data, id, { archivedAt: undefined });
}

export function canDeleteCategory(data: LedgerData, categoryId: string): boolean {
  const referenced = data.transactions.some((t) => t.categoryId === categoryId);
  const budgeted = data.budgets.some((b) => b.categoryId === categoryId);
  return !referenced && !budgeted;
}

/** No-op when the category is still used by a transaction or a budget. */
export function deleteCategory(data: LedgerData, id: string): LedgerData {
  if (!canDeleteCategory(data, id)) return data;
  return { ...data, categories: data.categories.filter((c) => c.id !== id) };
}

/* ── Transactions ──────────────────────────────────────────────────────────── */

export interface TransactionInput {
  walletId: string;
  categoryId?: string;
  type: TransactionType;
  amountCents: number;
  date: string;
  description: string;
  notes?: string;
  transferToWalletId?: string;
  source?: TransactionSource;
  importBatchId?: string;
}

export function createTransaction(data: LedgerData, input: TransactionInput, id = makeId()): { data: LedgerData; id: string } {
  const stamp = now();
  const transaction: Transaction = {
    id,
    walletId: input.walletId,
    categoryId: input.categoryId,
    type: (TRANSACTION_TYPES as readonly string[]).includes(input.type) ? input.type : "expense",
    amountCents: Math.max(0, Math.round(input.amountCents)),
    date: input.date,
    description: input.description.trim(),
    notes: input.notes?.trim() || undefined,
    transferToWalletId: input.type === "transfer" ? input.transferToWalletId : undefined,
    source: input.source ?? "manual",
    importBatchId: input.importBatchId,
    createdAt: stamp,
    updatedAt: stamp,
  };
  return { data: { ...data, transactions: [...data.transactions, transaction] }, id };
}

export function updateTransaction(
  data: LedgerData,
  id: string,
  patch: Partial<Pick<Transaction, "walletId" | "categoryId" | "type" | "amountCents" | "date" | "description" | "notes" | "transferToWalletId">>,
): LedgerData {
  return {
    ...data,
    transactions: data.transactions.map((t) =>
      t.id === id
        ? {
            ...t,
            ...patch,
            amountCents: patch.amountCents !== undefined ? Math.max(0, Math.round(patch.amountCents)) : t.amountCents,
            updatedAt: now(),
          }
        : t,
    ),
  };
}

export function deleteTransaction(data: LedgerData, id: string): LedgerData {
  return { ...data, transactions: data.transactions.filter((t) => t.id !== id) };
}

/** Bulk-assign a category — the Triage board's core move. */
export function categorizeTransactions(data: LedgerData, txIds: string[], categoryId: string): LedgerData {
  const ids = new Set(txIds);
  return {
    ...data,
    transactions: data.transactions.map((t) => (ids.has(t.id) ? { ...t, categoryId, updatedAt: now() } : t)),
  };
}

/* ── Budgets ───────────────────────────────────────────────────────────────── */

export interface BudgetInput {
  categoryId: string;
  monthCents: number;
}

/** One budget per category — setting again updates the existing ceiling
 *  rather than creating a duplicate. */
export function setBudget(data: LedgerData, input: BudgetInput, id = makeId()): { data: LedgerData; id: string } {
  const monthCents = Math.max(0, Math.round(input.monthCents));
  const existing = data.budgets.find((b) => b.categoryId === input.categoryId);
  if (existing) {
    return {
      data: { ...data, budgets: data.budgets.map((b) => (b.id === existing.id ? { ...b, monthCents } : b)) },
      id: existing.id,
    };
  }
  const budget: Budget = { id, categoryId: input.categoryId, monthCents };
  return { data: { ...data, budgets: [...data.budgets, budget] }, id };
}

export function deleteBudget(data: LedgerData, id: string): LedgerData {
  return { ...data, budgets: data.budgets.filter((b) => b.id !== id) };
}

/* ── Goals ─────────────────────────────────────────────────────────────────── */

export interface GoalInput {
  name: string;
  horizon?: GoalHorizon;
  targetCents?: number;
  deadline?: string;
  color?: string;
}

export function createGoal(data: LedgerData, input: GoalInput, id = makeId()): { data: LedgerData; id: string } {
  const goal: Goal = {
    id,
    name: input.name.trim() || "Untitled goal",
    horizon: input.horizon && (GOAL_HORIZONS as readonly string[]).includes(input.horizon) ? input.horizon : "short",
    targetCents: Math.max(0, Math.round(input.targetCents ?? 0)),
    deadline: input.deadline,
    color: input.color ?? DEFAULT_GOAL_COLOR,
    items: [],
    createdAt: now(),
  };
  return { data: { ...data, goals: [...data.goals, goal] }, id };
}

export function updateGoal(data: LedgerData, id: string, patch: Partial<Pick<Goal, "name" | "horizon" | "targetCents" | "deadline" | "color" | "archivedAt">>): LedgerData {
  return { ...data, goals: data.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)) };
}

export function archiveGoal(data: LedgerData, id: string): LedgerData {
  return updateGoal(data, id, { archivedAt: now() });
}

export function unarchiveGoal(data: LedgerData, id: string): LedgerData {
  return updateGoal(data, id, { archivedAt: undefined });
}

/** Removes the goal, its items (embedded) and its contributions. */
export function deleteGoal(data: LedgerData, id: string): LedgerData {
  return {
    ...data,
    goals: data.goals.filter((g) => g.id !== id),
    contributions: data.contributions.filter((c) => c.goalId !== id),
  };
}

export interface GoalItemInput {
  name: string;
  priceCents: number;
  url?: string;
}

export function addGoalItem(data: LedgerData, goalId: string, input: GoalItemInput, id = makeId()): { data: LedgerData; id: string } {
  const item: GoalItem = { id, name: input.name.trim() || "Item", priceCents: Math.max(0, Math.round(input.priceCents)), done: false, url: input.url };
  return {
    data: { ...data, goals: data.goals.map((g) => (g.id === goalId ? { ...g, items: [...g.items, item] } : g)) },
    id,
  };
}

export function updateGoalItem(data: LedgerData, goalId: string, itemId: string, patch: Partial<Pick<GoalItem, "name" | "priceCents" | "done" | "url">>): LedgerData {
  return {
    ...data,
    goals: data.goals.map((g) =>
      g.id === goalId
        ? {
            ...g,
            items: g.items.map((i) =>
              i.id === itemId
                ? { ...i, ...patch, priceCents: patch.priceCents !== undefined ? Math.max(0, Math.round(patch.priceCents)) : i.priceCents }
                : i,
            ),
          }
        : g,
    ),
  };
}

export function deleteGoalItem(data: LedgerData, goalId: string, itemId: string): LedgerData {
  return {
    ...data,
    goals: data.goals.map((g) => (g.id === goalId ? { ...g, items: g.items.filter((i) => i.id !== itemId) } : g)),
  };
}

/** The itemized sum becomes the goal's own target. */
export function setGoalTargetFromItems(data: LedgerData, goalId: string): LedgerData {
  const goal = data.goals.find((g) => g.id === goalId);
  if (!goal) return data;
  const sum = goal.items.reduce((acc, i) => acc + i.priceCents, 0);
  return updateGoal(data, goalId, { targetCents: sum });
}

export interface ContributionInput {
  amountCents: number;
  date: string;
  walletId?: string;
}

export function addContribution(data: LedgerData, goalId: string, input: ContributionInput, id = makeId()): { data: LedgerData; id: string } {
  const contribution: Contribution = { id, goalId, amountCents: Math.max(0, Math.round(input.amountCents)), date: input.date, walletId: input.walletId };
  return { data: { ...data, contributions: [...data.contributions, contribution] }, id };
}

export function deleteContribution(data: LedgerData, id: string): LedgerData {
  return { ...data, contributions: data.contributions.filter((c) => c.id !== id) };
}

/* ── Queries ───────────────────────────────────────────────────────────────── */

/** Sum of every transaction affecting `walletId`, optionally only up to (and
 *  including) `atDate`. Transfers move money between two wallets and never
 *  count as income or expense on their own. */
export function walletBalance(data: LedgerData, walletId: string, atDate?: string): number {
  let total = 0;
  for (const t of data.transactions) {
    if (atDate && t.date > atDate) continue;
    if (t.type === "income" && t.walletId === walletId) total += t.amountCents;
    else if (t.type === "expense" && t.walletId === walletId) total -= t.amountCents;
    else if (t.type === "transfer") {
      if (t.walletId === walletId) total -= t.amountCents;
      if (t.transferToWalletId === walletId) total += t.amountCents;
    }
  }
  return total;
}

export interface CategoryMonthTotal {
  categoryId: string | null;
  incomeCents: number;
  expenseCents: number;
}

export interface MonthSummary {
  month: string;
  incomeCents: number;
  expenseCents: number;
  netCents: number;
  byCategory: CategoryMonthTotal[];
}

/** Income/expense/net for one "yyyy-MM", broken down per category.
 *  Transfers are excluded entirely — they are neither income nor expense. */
export function monthSummary(data: LedgerData, yyyyMM: string): MonthSummary {
  const inMonth = data.transactions.filter((t) => t.type !== "transfer" && monthOf(t.date) === yyyyMM);
  const byCategoryMap = new Map<string | null, CategoryMonthTotal>();
  let incomeCents = 0;
  let expenseCents = 0;

  for (const t of inMonth) {
    const key = t.categoryId ?? null;
    const entry = byCategoryMap.get(key) ?? { categoryId: key, incomeCents: 0, expenseCents: 0 };
    if (t.type === "income") {
      entry.incomeCents += t.amountCents;
      incomeCents += t.amountCents;
    } else {
      entry.expenseCents += t.amountCents;
      expenseCents += t.amountCents;
    }
    byCategoryMap.set(key, entry);
  }

  return { month: yyyyMM, incomeCents, expenseCents, netCents: incomeCents - expenseCents, byCategory: [...byCategoryMap.values()] };
}

export function topExpenses(data: LedgerData, yyyyMM: string, n: number): CategoryMonthTotal[] {
  return monthSummary(data, yyyyMM)
    .byCategory.filter((c) => c.expenseCents > 0)
    .sort((a, b) => b.expenseCents - a.expenseCents)
    .slice(0, n);
}

export interface EvolutionPoint {
  month: string;
  netCents: number;
  cumulativeCents: number;
}

/** `monthsBack` months ending at (and including) `endMonth`, oldest first,
 *  with a running cumulative net over that window. */
export function evolution(data: LedgerData, monthsBack: number, endMonth: string = currentYYYYMM()): EvolutionPoint[] {
  const points: EvolutionPoint[] = [];
  let cumulative = 0;
  for (let i = monthsBack - 1; i >= 0; i--) {
    const month = shiftMonth(endMonth, -i);
    const netCents = monthSummary(data, month).netCents;
    cumulative += netCents;
    points.push({ month, netCents, cumulativeCents: cumulative });
  }
  return points;
}

export interface BudgetStatus {
  budgetId: string;
  categoryId: string;
  limitCents: number;
  spentCents: number;
  remainingCents: number;
  overBudget: boolean;
}

export function budgetStatus(data: LedgerData, yyyyMM: string): BudgetStatus[] {
  const summary = monthSummary(data, yyyyMM);
  return data.budgets.map((b) => {
    const spentCents = summary.byCategory.find((c) => c.categoryId === b.categoryId)?.expenseCents ?? 0;
    return {
      budgetId: b.id,
      categoryId: b.categoryId,
      limitCents: b.monthCents,
      spentCents,
      remainingCents: b.monthCents - spentCents,
      overBudget: spentCents > b.monthCents,
    };
  });
}

export interface GoalProgress {
  goalId: string;
  targetCents: number;
  contributedCents: number;
  itemizedSumCents: number;
  doneItemsCents: number;
  progressPct: number;
}

export function goalProgress(data: LedgerData, goalId: string): GoalProgress | null {
  const goal = data.goals.find((g) => g.id === goalId);
  if (!goal) return null;
  const contributedCents = data.contributions.filter((c) => c.goalId === goalId).reduce((acc, c) => acc + c.amountCents, 0);
  const itemizedSumCents = goal.items.reduce((acc, i) => acc + i.priceCents, 0);
  const doneItemsCents = goal.items.filter((i) => i.done).reduce((acc, i) => acc + i.priceCents, 0);
  const progressPct = goal.targetCents > 0 ? Math.round((contributedCents / goal.targetCents) * 100) : 0;
  return { goalId, targetCents: goal.targetCents, contributedCents, itemizedSumCents, doneItemsCents, progressPct };
}

/* ── Persistence guard ─────────────────────────────────────────────────────── */

/** Coerce anything (partial data, foreign writes, garbage) into a valid ledger. */
export function migrate(raw: unknown): LedgerData {
  if (!raw || typeof raw !== "object") return emptyLedger();
  const obj = raw as Partial<LedgerData>;

  const wallets: Wallet[] = Array.isArray(obj.wallets)
    ? obj.wallets
        .filter((w): w is Wallet => !!w && typeof w === "object" && typeof w.id === "string" && typeof w.name === "string")
        .map((w) => ({
          id: w.id,
          name: w.name,
          type: (WALLET_TYPES as readonly string[]).includes(w.type) ? w.type : "cash",
          color: typeof w.color === "string" ? w.color : DEFAULT_WALLET_COLOR,
          createdAt: typeof w.createdAt === "string" ? w.createdAt : now(),
          archivedAt: typeof w.archivedAt === "string" ? w.archivedAt : undefined,
        }))
    : [];
  const walletIds = new Set(wallets.map((w) => w.id));

  const categories: Category[] = Array.isArray(obj.categories)
    ? obj.categories
        .filter((c): c is Category => !!c && typeof c === "object" && typeof c.id === "string" && typeof c.name === "string")
        .map((c) => ({
          id: c.id,
          name: c.name,
          kind: (CATEGORY_KINDS as readonly string[]).includes(c.kind) ? c.kind : "expense",
          color: typeof c.color === "string" ? c.color : DEFAULT_CATEGORY_COLOR,
          createdAt: typeof c.createdAt === "string" ? c.createdAt : now(),
          archivedAt: typeof c.archivedAt === "string" ? c.archivedAt : undefined,
        }))
    : [];
  const categoryIds = new Set(categories.map((c) => c.id));

  const transactions: Transaction[] = Array.isArray(obj.transactions)
    ? obj.transactions
        .filter(
          (t): t is Transaction =>
            !!t && typeof t === "object" && typeof t.id === "string" && typeof t.walletId === "string" &&
            walletIds.has(t.walletId) && typeof t.date === "string",
        )
        .map((t) => ({
          id: t.id,
          walletId: t.walletId,
          categoryId: typeof t.categoryId === "string" && categoryIds.has(t.categoryId) ? t.categoryId : undefined,
          type: (TRANSACTION_TYPES as readonly string[]).includes(t.type) ? t.type : "expense",
          amountCents: typeof t.amountCents === "number" && Number.isFinite(t.amountCents) ? Math.max(0, Math.round(t.amountCents)) : 0,
          date: t.date,
          description: typeof t.description === "string" ? t.description : "",
          notes: typeof t.notes === "string" ? t.notes : undefined,
          transferToWalletId: typeof t.transferToWalletId === "string" && walletIds.has(t.transferToWalletId) ? t.transferToWalletId : undefined,
          source: t.source === "ai-import" ? "ai-import" : "manual",
          importBatchId: typeof t.importBatchId === "string" ? t.importBatchId : undefined,
          createdAt: typeof t.createdAt === "string" ? t.createdAt : now(),
          updatedAt: typeof t.updatedAt === "string" ? t.updatedAt : now(),
        }))
    : [];

  const budgets: Budget[] = Array.isArray(obj.budgets)
    ? obj.budgets
        .filter((b): b is Budget => !!b && typeof b === "object" && typeof b.id === "string" && typeof b.categoryId === "string" && categoryIds.has(b.categoryId))
        .map((b) => ({ id: b.id, categoryId: b.categoryId, monthCents: typeof b.monthCents === "number" ? Math.max(0, Math.round(b.monthCents)) : 0 }))
    : [];

  const goals: Goal[] = Array.isArray(obj.goals)
    ? obj.goals
        .filter((g): g is Goal => !!g && typeof g === "object" && typeof g.id === "string" && typeof g.name === "string")
        .map((g) => ({
          id: g.id,
          name: g.name,
          horizon: (GOAL_HORIZONS as readonly string[]).includes(g.horizon) ? g.horizon : "short",
          targetCents: typeof g.targetCents === "number" ? Math.max(0, Math.round(g.targetCents)) : 0,
          deadline: typeof g.deadline === "string" ? g.deadline : undefined,
          color: typeof g.color === "string" ? g.color : DEFAULT_GOAL_COLOR,
          items: Array.isArray(g.items)
            ? g.items
                .filter((i): i is GoalItem => !!i && typeof i === "object" && typeof i.id === "string" && typeof i.name === "string")
                .map((i) => ({ id: i.id, name: i.name, priceCents: typeof i.priceCents === "number" ? Math.max(0, Math.round(i.priceCents)) : 0, done: !!i.done, url: typeof i.url === "string" ? i.url : undefined }))
            : [],
          createdAt: typeof g.createdAt === "string" ? g.createdAt : now(),
          archivedAt: typeof g.archivedAt === "string" ? g.archivedAt : undefined,
        }))
    : [];
  const goalIds = new Set(goals.map((g) => g.id));

  const contributions: Contribution[] = Array.isArray(obj.contributions)
    ? obj.contributions
        .filter((c): c is Contribution => !!c && typeof c === "object" && typeof c.id === "string" && typeof c.goalId === "string" && goalIds.has(c.goalId))
        .map((c) => ({
          id: c.id,
          goalId: c.goalId,
          amountCents: typeof c.amountCents === "number" ? Math.max(0, Math.round(c.amountCents)) : 0,
          date: typeof c.date === "string" ? c.date : now().slice(0, 10),
          walletId: typeof c.walletId === "string" && walletIds.has(c.walletId) ? c.walletId : undefined,
        }))
    : [];

  return { meta: { version: LEDGER_VERSION, currency: "BRL" }, wallets, categories, transactions, budgets, goals, contributions };
}
