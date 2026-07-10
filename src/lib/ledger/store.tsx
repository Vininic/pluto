import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import {
  addContribution as svcAddContribution,
  addGoalItem as svcAddGoalItem,
  archiveCategory as svcArchiveCategory,
  archiveGoal as svcArchiveGoal,
  archiveWallet as svcArchiveWallet,
  categorizeTransactions as svcCategorizeTransactions,
  createCategory as svcCreateCategory,
  createGoal as svcCreateGoal,
  createTransaction as svcCreateTransaction,
  createWallet as svcCreateWallet,
  deleteBudget as svcDeleteBudget,
  deleteCategory as svcDeleteCategory,
  deleteContribution as svcDeleteContribution,
  deleteGoal as svcDeleteGoal,
  deleteGoalItem as svcDeleteGoalItem,
  deleteTransaction as svcDeleteTransaction,
  deleteWallet as svcDeleteWallet,
  migrate,
  setBudget as svcSetBudget,
  setGoalTargetFromItems as svcSetGoalTargetFromItems,
  unarchiveCategory as svcUnarchiveCategory,
  unarchiveGoal as svcUnarchiveGoal,
  unarchiveWallet as svcUnarchiveWallet,
  updateCategory as svcUpdateCategory,
  updateGoal as svcUpdateGoal,
  updateGoalItem as svcUpdateGoalItem,
  updateTransaction as svcUpdateTransaction,
  updateWallet as svcUpdateWallet,
  type BudgetInput,
  type CategoryInput,
  type ContributionInput,
  type GoalInput,
  type GoalItemInput,
  type TransactionInput,
  type WalletInput,
} from "./service";
import { emptyLedger, makeId, type Budget, type Category, type Goal, type GoalItem, type LedgerData, type Transaction, type Wallet } from "./types";

export const LEDGER_STORAGE_KEY = "pluto.ledger.v1";
/** Fired by the sync engine after it rewrites localStorage with remote data;
 *  the store re-hydrates in place (no reload needed). */
export const LEDGER_PULLED_EVENT = "pluto:ledger-pulled";

function readStored(): LedgerData {
  try {
    const raw = localStorage.getItem(LEDGER_STORAGE_KEY);
    return raw ? migrate(JSON.parse(raw)) : emptyLedger();
  } catch {
    return emptyLedger();
  }
}

interface LedgerCtx {
  data: LedgerData;
  createWallet: (input: WalletInput) => string;
  updateWallet: (id: string, patch: Partial<Pick<Wallet, "name" | "type" | "color" | "archivedAt">>) => void;
  archiveWallet: (id: string) => void;
  unarchiveWallet: (id: string) => void;
  deleteWallet: (id: string) => void;
  createCategory: (input: CategoryInput) => string;
  updateCategory: (id: string, patch: Partial<Pick<Category, "name" | "color" | "archivedAt">>) => void;
  archiveCategory: (id: string) => void;
  unarchiveCategory: (id: string) => void;
  deleteCategory: (id: string) => void;
  createTransaction: (input: TransactionInput) => string;
  updateTransaction: (id: string, patch: Partial<Pick<Transaction, "walletId" | "categoryId" | "type" | "amountCents" | "date" | "description" | "notes" | "transferToWalletId">>) => void;
  deleteTransaction: (id: string) => void;
  categorizeTransactions: (txIds: string[], categoryId: string) => void;
  setBudget: (input: BudgetInput) => string;
  deleteBudget: (id: string) => void;
  createGoal: (input: GoalInput) => string;
  updateGoal: (id: string, patch: Partial<Pick<Goal, "name" | "horizon" | "targetCents" | "deadline" | "color" | "archivedAt">>) => void;
  archiveGoal: (id: string) => void;
  unarchiveGoal: (id: string) => void;
  deleteGoal: (id: string) => void;
  addGoalItem: (goalId: string, input: GoalItemInput) => string;
  updateGoalItem: (goalId: string, itemId: string, patch: Partial<Pick<GoalItem, "name" | "priceCents" | "done" | "url">>) => void;
  deleteGoalItem: (goalId: string, itemId: string) => void;
  setGoalTargetFromItems: (goalId: string) => void;
  addContribution: (goalId: string, input: ContributionInput) => string;
  deleteContribution: (id: string) => void;
  /** Replace the whole ledger (Aetheris actions, imports). */
  replaceLedger: (next: LedgerData) => void;
}

const Ctx = createContext<LedgerCtx | null>(null);

export function LedgerProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<LedgerData>(readStored);

  // Write-through persistence: the sync engine mirrors this key to Supabase.
  useEffect(() => {
    try {
      localStorage.setItem(LEDGER_STORAGE_KEY, JSON.stringify(data));
    } catch {
      /* storage full or unavailable — keep running in memory */
    }
  }, [data]);

  // Re-hydrate after a cloud pull, and converge across tabs of the same browser.
  useEffect(() => {
    const rehydrate = () => setData(readStored());
    const onStorage = (e: StorageEvent) => {
      if (e.key === LEDGER_STORAGE_KEY) rehydrate();
    };
    window.addEventListener(LEDGER_PULLED_EVENT, rehydrate);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(LEDGER_PULLED_EVENT, rehydrate);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const createWallet = useCallback((input: WalletInput) => {
    const id = makeId();
    setData((d) => svcCreateWallet(d, input, id).data);
    return id;
  }, []);
  const updateWallet = useCallback<LedgerCtx["updateWallet"]>((id, patch) => setData((d) => svcUpdateWallet(d, id, patch)), []);
  const archiveWallet = useCallback((id: string) => setData((d) => svcArchiveWallet(d, id)), []);
  const unarchiveWallet = useCallback((id: string) => setData((d) => svcUnarchiveWallet(d, id)), []);
  const deleteWallet = useCallback((id: string) => setData((d) => svcDeleteWallet(d, id)), []);

  const createCategory = useCallback((input: CategoryInput) => {
    const id = makeId();
    setData((d) => svcCreateCategory(d, input, id).data);
    return id;
  }, []);
  const updateCategory = useCallback<LedgerCtx["updateCategory"]>((id, patch) => setData((d) => svcUpdateCategory(d, id, patch)), []);
  const archiveCategory = useCallback((id: string) => setData((d) => svcArchiveCategory(d, id)), []);
  const unarchiveCategory = useCallback((id: string) => setData((d) => svcUnarchiveCategory(d, id)), []);
  const deleteCategory = useCallback((id: string) => setData((d) => svcDeleteCategory(d, id)), []);

  const createTransaction = useCallback((input: TransactionInput) => {
    const id = makeId();
    setData((d) => svcCreateTransaction(d, input, id).data);
    return id;
  }, []);
  const updateTransaction = useCallback<LedgerCtx["updateTransaction"]>((id, patch) => setData((d) => svcUpdateTransaction(d, id, patch)), []);
  const deleteTransaction = useCallback((id: string) => setData((d) => svcDeleteTransaction(d, id)), []);
  const categorizeTransactions = useCallback((txIds: string[], categoryId: string) => setData((d) => svcCategorizeTransactions(d, txIds, categoryId)), []);

  const setBudget = useCallback((input: BudgetInput) => {
    const id = makeId();
    let resultId = id;
    setData((d) => {
      const res = svcSetBudget(d, input, id);
      resultId = res.id;
      return res.data;
    });
    return resultId;
  }, []);
  const deleteBudget = useCallback((id: string) => setData((d) => svcDeleteBudget(d, id)), []);

  const createGoal = useCallback((input: GoalInput) => {
    const id = makeId();
    setData((d) => svcCreateGoal(d, input, id).data);
    return id;
  }, []);
  const updateGoal = useCallback<LedgerCtx["updateGoal"]>((id, patch) => setData((d) => svcUpdateGoal(d, id, patch)), []);
  const archiveGoal = useCallback((id: string) => setData((d) => svcArchiveGoal(d, id)), []);
  const unarchiveGoal = useCallback((id: string) => setData((d) => svcUnarchiveGoal(d, id)), []);
  const deleteGoal = useCallback((id: string) => setData((d) => svcDeleteGoal(d, id)), []);
  const addGoalItem = useCallback((goalId: string, input: GoalItemInput) => {
    const id = makeId();
    setData((d) => svcAddGoalItem(d, goalId, input, id).data);
    return id;
  }, []);
  const updateGoalItem = useCallback<LedgerCtx["updateGoalItem"]>((goalId, itemId, patch) => setData((d) => svcUpdateGoalItem(d, goalId, itemId, patch)), []);
  const deleteGoalItem = useCallback((goalId: string, itemId: string) => setData((d) => svcDeleteGoalItem(d, goalId, itemId)), []);
  const setGoalTargetFromItems = useCallback((goalId: string) => setData((d) => svcSetGoalTargetFromItems(d, goalId)), []);
  const addContribution = useCallback((goalId: string, input: ContributionInput) => {
    const id = makeId();
    setData((d) => svcAddContribution(d, goalId, input, id).data);
    return id;
  }, []);
  const deleteContribution = useCallback((id: string) => setData((d) => svcDeleteContribution(d, id)), []);

  const replaceLedger = useCallback((next: LedgerData) => setData(migrate(next)), []);

  return (
    <Ctx.Provider
      value={{
        data,
        createWallet, updateWallet, archiveWallet, unarchiveWallet, deleteWallet,
        createCategory, updateCategory, archiveCategory, unarchiveCategory, deleteCategory,
        createTransaction, updateTransaction, deleteTransaction, categorizeTransactions,
        setBudget, deleteBudget,
        createGoal, updateGoal, archiveGoal, unarchiveGoal, deleteGoal,
        addGoalItem, updateGoalItem, deleteGoalItem, setGoalTargetFromItems,
        addContribution, deleteContribution,
        replaceLedger,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useLedger(): LedgerCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useLedger must be used within LedgerProvider");
  return ctx;
}
