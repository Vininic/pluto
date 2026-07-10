import { describe, expect, it } from "vitest";
import {
  addContribution,
  addGoalItem,
  archiveWallet,
  budgetStatus,
  canDeleteCategory,
  canDeleteWallet,
  categorizeTransactions,
  createCategory,
  createGoal,
  createTransaction,
  createWallet,
  deleteBudget,
  deleteCategory,
  deleteContribution,
  deleteGoal,
  deleteGoalItem,
  deleteTransaction,
  deleteWallet,
  evolution,
  goalProgress,
  migrate,
  monthSummary,
  setBudget,
  setGoalTargetFromItems,
  shiftMonth,
  topExpenses,
  unarchiveWallet,
  updateGoalItem,
  updateTransaction,
  updateWallet,
  walletBalance,
} from "./service";
import { emptyLedger, LEDGER_VERSION, type LedgerData } from "./types";

function seedWallet(data: LedgerData = emptyLedger(), name = "Checking") {
  const res = createWallet(data, { name });
  return { data: res.data, walletId: res.id };
}

function seedTwoWallets() {
  const { data: d1, walletId: a } = seedWallet(emptyLedger(), "Checking");
  const { data, walletId: b } = seedWallet(d1, "Savings");
  return { data, a, b };
}

describe("wallets", () => {
  it("creates a wallet with defaults and trims the name", () => {
    const { data, id } = createWallet(emptyLedger(), { name: "  Nubank  " });
    const wallet = data.wallets.find((w) => w.id === id)!;
    expect(wallet.name).toBe("Nubank");
    expect(wallet.type).toBe("cash");
    expect(wallet.color).toBeTruthy();
  });

  it("updates wallet fields", () => {
    const { data, walletId } = seedWallet();
    const next = updateWallet(data, walletId, { name: "Renamed", type: "savings" });
    const wallet = next.wallets.find((w) => w.id === walletId)!;
    expect(wallet.name).toBe("Renamed");
    expect(wallet.type).toBe("savings");
  });

  it("archives and unarchives a wallet", () => {
    const { data, walletId } = seedWallet();
    const archived = archiveWallet(data, walletId);
    expect(archived.wallets.find((w) => w.id === walletId)!.archivedAt).toBeTruthy();
    const restored = unarchiveWallet(archived, walletId);
    expect(restored.wallets.find((w) => w.id === walletId)!.archivedAt).toBeUndefined();
  });

  it("deletes an unreferenced wallet", () => {
    const { data, walletId } = seedWallet();
    expect(canDeleteWallet(data, walletId)).toBe(true);
    const next = deleteWallet(data, walletId);
    expect(next.wallets).toHaveLength(0);
  });

  it("refuses to delete a wallet with transactions — archive-only cascade rule", () => {
    const { data, walletId } = seedWallet();
    const { data: withTx } = createTransaction(data, { walletId, type: "expense", amountCents: 500, date: "2026-07-01", description: "Coffee" });
    expect(canDeleteWallet(withTx, walletId)).toBe(false);
    const next = deleteWallet(withTx, walletId);
    expect(next.wallets).toHaveLength(1);
    expect(next.transactions).toHaveLength(1);
  });

  it("refuses to delete a wallet referenced only as a transfer destination", () => {
    const { data, a, b } = seedTwoWallets();
    const { data: withTransfer } = createTransaction(data, { walletId: a, type: "transfer", transferToWalletId: b, amountCents: 1000, date: "2026-07-01", description: "Move" });
    expect(canDeleteWallet(withTransfer, b)).toBe(false);
  });
});

describe("categories", () => {
  it("creates a category, falling back to expense for an invalid kind", () => {
    const { data, id } = createCategory(emptyLedger(), { name: "Food", kind: "bogus" as never });
    expect(data.categories.find((c) => c.id === id)!.kind).toBe("expense");
  });

  it("deletes an unreferenced category", () => {
    const { data, id } = createCategory(emptyLedger(), { name: "Food", kind: "expense" });
    expect(canDeleteCategory(data, id)).toBe(true);
    expect(deleteCategory(data, id).categories).toHaveLength(0);
  });

  it("refuses to delete a category used by a transaction", () => {
    const { data: withCat, id: categoryId } = createCategory(emptyLedger(), { name: "Food", kind: "expense" });
    const { data: withWallet, walletId } = seedWallet(withCat);
    const { data } = createTransaction(withWallet, { walletId, categoryId, type: "expense", amountCents: 100, date: "2026-07-01", description: "Lunch" });
    expect(canDeleteCategory(data, categoryId)).toBe(false);
    expect(deleteCategory(data, categoryId).categories).toHaveLength(1);
  });

  it("refuses to delete a category with a budget", () => {
    const { data: withCat, id: categoryId } = createCategory(emptyLedger(), { name: "Food", kind: "expense" });
    const { data } = setBudget(withCat, { categoryId, monthCents: 50000 });
    expect(canDeleteCategory(data, categoryId)).toBe(false);
  });
});

describe("transactions", () => {
  it("creates a transaction, trimming description and rounding cents", () => {
    const { data, walletId } = seedWallet();
    const { data: next, id } = createTransaction(data, { walletId, type: "expense", amountCents: 199.6, date: "2026-07-01", description: "  Coffee  " });
    const tx = next.transactions.find((t) => t.id === id)!;
    expect(tx.description).toBe("Coffee");
    expect(tx.amountCents).toBe(200);
    expect(tx.source).toBe("manual");
  });

  it("only keeps transferToWalletId for transfer transactions", () => {
    const { data, a, b } = seedTwoWallets();
    const { data: next, id } = createTransaction(data, { walletId: a, type: "expense", transferToWalletId: b, amountCents: 100, date: "2026-07-01", description: "Not a transfer" });
    expect(next.transactions.find((t) => t.id === id)!.transferToWalletId).toBeUndefined();
  });

  it("updates a transaction and re-rounds an updated amount", () => {
    const { data, walletId } = seedWallet();
    const { data: withTx, id } = createTransaction(data, { walletId, type: "expense", amountCents: 100, date: "2026-07-01", description: "Coffee" });
    const next = updateTransaction(withTx, id, { amountCents: 250.4 });
    expect(next.transactions.find((t) => t.id === id)!.amountCents).toBe(250);
  });

  it("deletes a transaction", () => {
    const { data, walletId } = seedWallet();
    const { data: withTx, id } = createTransaction(data, { walletId, type: "expense", amountCents: 100, date: "2026-07-01", description: "Coffee" });
    expect(deleteTransaction(withTx, id).transactions).toHaveLength(0);
  });

  it("bulk-categorizes transactions for the triage board", () => {
    const { data: withCat, id: categoryId } = createCategory(emptyLedger(), { name: "Food", kind: "expense" });
    const { data: withWallet, walletId } = seedWallet(withCat);
    const { data: d1, id: t1 } = createTransaction(withWallet, { walletId, type: "expense", amountCents: 100, date: "2026-07-01", description: "A" });
    const { data: d2, id: t2 } = createTransaction(d1, { walletId, type: "expense", amountCents: 200, date: "2026-07-02", description: "B" });
    const next = categorizeTransactions(d2, [t1, t2], categoryId);
    expect(next.transactions.every((t) => t.categoryId === categoryId)).toBe(true);
  });
});

describe("transfers are neutral", () => {
  it("counts in neither income nor expense in monthSummary", () => {
    const { data, a, b } = seedTwoWallets();
    const { data: withTransfer } = createTransaction(data, { walletId: a, type: "transfer", transferToWalletId: b, amountCents: 5000, date: "2026-07-10", description: "Move to savings" });
    const summary = monthSummary(withTransfer, "2026-07");
    expect(summary.incomeCents).toBe(0);
    expect(summary.expenseCents).toBe(0);
    expect(summary.netCents).toBe(0);
    expect(summary.byCategory).toHaveLength(0);
  });

  it("moves the balance from source to destination wallet", () => {
    const { data, a, b } = seedTwoWallets();
    const { data: withTransfer } = createTransaction(data, { walletId: a, type: "transfer", transferToWalletId: b, amountCents: 5000, date: "2026-07-10", description: "Move" });
    expect(walletBalance(withTransfer, a)).toBe(-5000);
    expect(walletBalance(withTransfer, b)).toBe(5000);
  });
});

describe("budgets", () => {
  it("sets a new budget", () => {
    const { data: withCat, id: categoryId } = createCategory(emptyLedger(), { name: "Food", kind: "expense" });
    const { data, id } = setBudget(withCat, { categoryId, monthCents: 50000 });
    expect(data.budgets.find((b) => b.id === id)!.monthCents).toBe(50000);
  });

  it("upserts by category instead of creating a duplicate", () => {
    const { data: withCat, id: categoryId } = createCategory(emptyLedger(), { name: "Food", kind: "expense" });
    const { data: d1, id: id1 } = setBudget(withCat, { categoryId, monthCents: 50000 });
    const { data: d2, id: id2 } = setBudget(d1, { categoryId, monthCents: 60000 });
    expect(id2).toBe(id1);
    expect(d2.budgets).toHaveLength(1);
    expect(d2.budgets[0].monthCents).toBe(60000);
  });

  it("deletes a budget", () => {
    const { data: withCat, id: categoryId } = createCategory(emptyLedger(), { name: "Food", kind: "expense" });
    const { data, id } = setBudget(withCat, { categoryId, monthCents: 50000 });
    expect(deleteBudget(data, id).budgets).toHaveLength(0);
  });
});

describe("goals", () => {
  it("creates a goal with defaults", () => {
    const { data, id } = createGoal(emptyLedger(), { name: "New PC" });
    const goal = data.goals.find((g) => g.id === id)!;
    expect(goal.horizon).toBe("short");
    expect(goal.targetCents).toBe(0);
    expect(goal.items).toEqual([]);
  });

  it("adds, updates and deletes goal items", () => {
    const { data: withGoal, id: goalId } = createGoal(emptyLedger(), { name: "New PC" });
    const { data: d1, id: itemId } = addGoalItem(withGoal, goalId, { name: "GPU", priceCents: 300000 });
    expect(d1.goals[0].items).toHaveLength(1);
    const d2 = updateGoalItem(d1, goalId, itemId, { done: true });
    expect(d2.goals[0].items[0].done).toBe(true);
    const d3 = deleteGoalItem(d2, goalId, itemId);
    expect(d3.goals[0].items).toHaveLength(0);
  });

  it("sets the goal target from the itemized sum", () => {
    const { data: withGoal, id: goalId } = createGoal(emptyLedger(), { name: "New PC" });
    const { data: d1 } = addGoalItem(withGoal, goalId, { name: "GPU", priceCents: 300000 });
    const { data: d2 } = addGoalItem(d1, goalId, { name: "CPU", priceCents: 150000 });
    const next = setGoalTargetFromItems(d2, goalId);
    expect(next.goals[0].targetCents).toBe(450000);
  });

  it("deleting a goal cascades to its contributions", () => {
    const { data: withGoal, id: goalId } = createGoal(emptyLedger(), { name: "New PC" });
    const { data: withContribution } = addContribution(withGoal, goalId, { amountCents: 10000, date: "2026-07-01" });
    const next = deleteGoal(withContribution, goalId);
    expect(next.goals).toHaveLength(0);
    expect(next.contributions).toHaveLength(0);
  });

  it("deletes a single contribution", () => {
    const { data: withGoal, id: goalId } = createGoal(emptyLedger(), { name: "New PC" });
    const { data, id } = addContribution(withGoal, goalId, { amountCents: 10000, date: "2026-07-01" });
    expect(deleteContribution(data, id).contributions).toHaveLength(0);
  });
});

describe("walletBalance", () => {
  it("sums income and expense for a wallet", () => {
    const { data, walletId } = seedWallet();
    const { data: d1 } = createTransaction(data, { walletId, type: "income", amountCents: 500000, date: "2026-07-01", description: "Salary" });
    const { data: d2 } = createTransaction(d1, { walletId, type: "expense", amountCents: 20000, date: "2026-07-05", description: "Groceries" });
    expect(walletBalance(d2, walletId)).toBe(480000);
  });

  it("respects an atDate cutoff", () => {
    const { data, walletId } = seedWallet();
    const { data: d1 } = createTransaction(data, { walletId, type: "income", amountCents: 1000, date: "2026-07-01", description: "A" });
    const { data: d2 } = createTransaction(d1, { walletId, type: "income", amountCents: 2000, date: "2026-07-15", description: "B" });
    expect(walletBalance(d2, walletId, "2026-07-01")).toBe(1000);
    expect(walletBalance(d2, walletId, "2026-07-31")).toBe(3000);
  });
});

describe("monthSummary", () => {
  it("computes income, expense, net and groups by category", () => {
    const { data: withCat, id: categoryId } = createCategory(emptyLedger(), { name: "Food", kind: "expense" });
    const { data: withWallet, walletId } = seedWallet(withCat);
    const { data: d1 } = createTransaction(withWallet, { walletId, type: "income", amountCents: 500000, date: "2026-07-01", description: "Salary" });
    const { data: d2 } = createTransaction(d1, { walletId, categoryId, type: "expense", amountCents: 15000, date: "2026-07-05", description: "Lunch" });
    const { data: d3 } = createTransaction(d2, { walletId, type: "expense", amountCents: 5000, date: "2026-06-20", description: "Out of month" });

    const summary = monthSummary(d3, "2026-07");
    expect(summary.incomeCents).toBe(500000);
    expect(summary.expenseCents).toBe(15000);
    expect(summary.netCents).toBe(485000);
    expect(summary.byCategory.find((c) => c.categoryId === categoryId)?.expenseCents).toBe(15000);
  });

  it("groups uncategorized transactions under a null key", () => {
    const { data, walletId } = seedWallet();
    const { data: withTx } = createTransaction(data, { walletId, type: "expense", amountCents: 1000, date: "2026-07-01", description: "Mystery" });
    const summary = monthSummary(withTx, "2026-07");
    expect(summary.byCategory).toEqual([{ categoryId: null, incomeCents: 0, expenseCents: 1000 }]);
  });
});

describe("topExpenses", () => {
  it("returns the top n categories by expense, descending", () => {
    const { data: d0, id: food } = createCategory(emptyLedger(), { name: "Food", kind: "expense" });
    const { data: d1, id: transport } = createCategory(d0, { name: "Transport", kind: "expense" });
    const { data: d2, id: rent } = createCategory(d1, { name: "Rent", kind: "expense" });
    const { data: withWallet, walletId } = seedWallet(d2);
    const { data: t1 } = createTransaction(withWallet, { walletId, categoryId: food, type: "expense", amountCents: 10000, date: "2026-07-01", description: "" });
    const { data: t2 } = createTransaction(t1, { walletId, categoryId: transport, type: "expense", amountCents: 5000, date: "2026-07-02", description: "" });
    const { data: t3 } = createTransaction(t2, { walletId, categoryId: rent, type: "expense", amountCents: 150000, date: "2026-07-03", description: "" });

    const top2 = topExpenses(t3, "2026-07", 2);
    expect(top2.map((c) => c.categoryId)).toEqual([rent, food]);
  });
});

describe("evolution", () => {
  it("returns monthsBack points ending at endMonth with a running cumulative", () => {
    const { data, walletId } = seedWallet();
    const { data: d1 } = createTransaction(data, { walletId, type: "income", amountCents: 1000, date: "2026-05-10", description: "" });
    const { data: d2 } = createTransaction(d1, { walletId, type: "expense", amountCents: 400, date: "2026-06-10", description: "" });
    const { data: d3 } = createTransaction(d2, { walletId, type: "income", amountCents: 200, date: "2026-07-10", description: "" });

    const points = evolution(d3, 3, "2026-07");
    expect(points.map((p) => p.month)).toEqual(["2026-05", "2026-06", "2026-07"]);
    expect(points.map((p) => p.netCents)).toEqual([1000, -400, 200]);
    expect(points.map((p) => p.cumulativeCents)).toEqual([1000, 600, 800]);
  });
});

describe("budgetStatus", () => {
  it("reports spent, remaining and over-budget", () => {
    const { data: d0, id: categoryId } = createCategory(emptyLedger(), { name: "Food", kind: "expense" });
    const { data: withBudget } = setBudget(d0, { categoryId, monthCents: 20000 });
    const { data: withWallet, walletId } = seedWallet(withBudget);
    const { data } = createTransaction(withWallet, { walletId, categoryId, type: "expense", amountCents: 25000, date: "2026-07-01", description: "" });

    const [status] = budgetStatus(data, "2026-07");
    expect(status.limitCents).toBe(20000);
    expect(status.spentCents).toBe(25000);
    expect(status.remainingCents).toBe(-5000);
    expect(status.overBudget).toBe(true);
  });
});

describe("goalProgress", () => {
  it("computes contributed, itemized and done sums", () => {
    const { data: withGoal, id: goalId } = createGoal(emptyLedger(), { name: "New PC", targetCents: 400000 });
    const { data: d1 } = addGoalItem(withGoal, goalId, { name: "GPU", priceCents: 300000 });
    const { data: d2, id: itemId } = addGoalItem(d1, goalId, { name: "CPU", priceCents: 100000 });
    const d3 = updateGoalItem(d2, goalId, itemId, { done: true });
    const { data: d4 } = addContribution(d3, goalId, { amountCents: 100000, date: "2026-07-01" });

    const progress = goalProgress(d4, goalId)!;
    expect(progress.contributedCents).toBe(100000);
    expect(progress.itemizedSumCents).toBe(400000);
    expect(progress.doneItemsCents).toBe(100000);
    expect(progress.progressPct).toBe(25);
  });

  it("returns null for a missing goal", () => {
    expect(goalProgress(emptyLedger(), "nope")).toBeNull();
  });
});

describe("shiftMonth", () => {
  it("shifts across year boundaries", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
  });
});

describe("migrate", () => {
  it("returns an empty ledger for garbage input", () => {
    expect(migrate(null)).toEqual(emptyLedger());
    expect(migrate("nonsense")).toEqual(emptyLedger());
  });

  it("stamps the current version and BRL currency", () => {
    const migrated = migrate({});
    expect(migrated.meta).toEqual({ version: LEDGER_VERSION, currency: "BRL" });
  });

  it("drops transactions referencing a missing wallet", () => {
    const raw = { wallets: [], transactions: [{ id: "t1", walletId: "ghost", date: "2026-07-01", type: "expense", amountCents: 100 }] };
    expect(migrate(raw).transactions).toHaveLength(0);
  });

  it("drops budgets referencing a missing category", () => {
    const raw = { categories: [], budgets: [{ id: "b1", categoryId: "ghost", monthCents: 1000 }] };
    expect(migrate(raw).budgets).toHaveLength(0);
  });

  it("coerces an invalid transaction type to expense", () => {
    const raw = {
      wallets: [{ id: "w1", name: "Checking" }],
      transactions: [{ id: "t1", walletId: "w1", date: "2026-07-01", type: "bogus", amountCents: 100 }],
    };
    expect(migrate(raw).transactions[0].type).toBe("expense");
  });

  it("round-trips a well-formed ledger unchanged in shape", () => {
    const { data } = createWallet(emptyLedger(), { name: "Checking" });
    const migrated = migrate(JSON.parse(JSON.stringify(data)));
    expect(migrated.wallets).toHaveLength(1);
    expect(migrated.wallets[0].name).toBe("Checking");
  });
});
