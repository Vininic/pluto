/** Realistic demo data — shown to first-time visitors (mostly portfolio
 *  reviewers) so every page has something real to look at instead of an
 *  empty state. Mirrors Chronos' `lib/demo/generator.ts` pattern: a pure
 *  generator plus a few localStorage flags, no UI here. */
import {
  addContribution,
  addGoalItem,
  createCategory,
  createGoal,
  createTransaction,
  createWallet,
  setBudget,
  setGoalTargetFromItems,
  type TransactionInput,
} from "@/lib/ledger/service";
import { emptyLedger, type LedgerData } from "@/lib/ledger/types";

const LEDGER_KEY = "pluto.ledger.v1";
const DEMO_FLAG = "pluto.demo.active";
const DISMISSED_FLAG = "pluto.demo.dismissed";

/** `monthsAgo(2, 15)` = the 15th, two months back from today. Clamped to 28
 *  so it never rolls into the wrong month regardless of today's date. */
function monthsAgo(n: number, day: number): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - n);
  d.setDate(Math.min(day, 28));
  return d.toISOString().slice(0, 10);
}

export function generateDemoData(): LedgerData {
  let data = emptyLedger();

  const wallet = (name: string, type: "cash" | "checking" | "savings" | "credit", color: string) => {
    const res = createWallet(data, { name, type, color });
    data = res.data;
    return res.id;
  };
  const category = (name: string, kind: "income" | "expense", color: string) => {
    const res = createCategory(data, { name, kind, color });
    data = res.data;
    return res.id;
  };
  const tx = (input: TransactionInput) => {
    data = createTransaction(data, input).data;
  };

  const nubank = wallet("Nubank", "checking", "#C49A3A");
  const carteira = wallet("Carteira", "cash", "#5E6B77");
  const xp = wallet("XP Investimentos", "savings", "#3E8A80");
  const cartaoInter = wallet("Cartão Inter", "credit", "#C2542C");

  const salario = category("Salário", "income", "#3E8A80");
  const freelance = category("Freelance", "income", "#4A8AB5");
  const alimentacao = category("Alimentação", "expense", "#C2542C");
  const transporte = category("Transporte", "expense", "#4A8AB5");
  const moradia = category("Moradia", "expense", "#7D4E8C");
  const lazer = category("Lazer", "expense", "#B96A82");
  const saude = category("Saúde", "expense", "#9C3541");
  const assinaturas = category("Assinaturas", "expense", "#35558E");

  for (let m = 3; m >= 0; m--) {
    const wobble = (base: number, spread: number) => base + Math.round((Math.random() - 0.5) * spread);

    tx({ walletId: nubank, categoryId: salario, type: "income", amountCents: wobble(520000, 30000), date: monthsAgo(m, 5), description: "Salário", source: "manual" });
    if (m % 2 === 0) tx({ walletId: nubank, categoryId: freelance, type: "income", amountCents: 80000, date: monthsAgo(m, 15), description: "Projeto freelance", source: "manual" });

    tx({ walletId: nubank, categoryId: moradia, type: "expense", amountCents: 180000, date: monthsAgo(m, 6), description: "Aluguel", source: "manual" });
    tx({ walletId: nubank, categoryId: moradia, type: "expense", amountCents: wobble(22000, 4000), date: monthsAgo(m, 7), description: "Contas de casa", source: "manual" });
    tx({ walletId: cartaoInter, categoryId: alimentacao, type: "expense", amountCents: wobble(48000, 12000), date: monthsAgo(m, 10), description: "Mercado", source: "manual" });
    tx({ walletId: cartaoInter, categoryId: alimentacao, type: "expense", amountCents: wobble(9000, 4000), date: monthsAgo(m, 18), description: "Restaurante", source: "manual" });
    tx({ walletId: carteira, categoryId: transporte, type: "expense", amountCents: wobble(6000, 2000), date: monthsAgo(m, 12), description: "Uber", source: "manual" });
    tx({ walletId: nubank, categoryId: transporte, type: "expense", amountCents: wobble(22000, 5000), date: monthsAgo(m, 3), description: "Combustível", source: "manual" });
    tx({ walletId: nubank, categoryId: assinaturas, type: "expense", amountCents: 5590, date: monthsAgo(m, 1), description: "Streaming", source: "manual" });
    tx({ walletId: cartaoInter, categoryId: lazer, type: "expense", amountCents: wobble(15000, 6000), date: monthsAgo(m, 20), description: "Cinema", source: "manual" });
    if (m === 1) tx({ walletId: nubank, categoryId: saude, type: "expense", amountCents: 25000, date: monthsAgo(m, 8), description: "Consulta médica", source: "manual" });

    tx({ walletId: nubank, type: "transfer", transferToWalletId: xp, amountCents: 50000, date: monthsAgo(m, 6), description: "Reserva mensal", source: "manual" });

    // One uncategorized row per month — gives Triage something real to sort.
    tx({ walletId: nubank, type: "expense", amountCents: wobble(9900, 3000), date: monthsAgo(m, 22), description: m === 0 ? "Compra não identificada" : "Débito avulso", source: "manual" });
  }

  data = setBudget(data, { categoryId: alimentacao, monthCents: 60000 }).data;
  data = setBudget(data, { categoryId: transporte, monthCents: 25000 }).data;
  data = setBudget(data, { categoryId: lazer, monthCents: 20000 }).data;

  const { data: withPcGoal, id: pcGoal } = createGoal(data, { name: "PC novo", horizon: "short", color: "#C49A3A" });
  data = withPcGoal;
  data = addGoalItem(data, pcGoal, { name: "Placa de vídeo", priceCents: 350000 }).data;
  data = addGoalItem(data, pcGoal, { name: "Processador", priceCents: 180000 }).data;
  data = addGoalItem(data, pcGoal, { name: "Memória RAM", priceCents: 60000, url: "https://example.com" }).data;
  data = setGoalTargetFromItems(data, pcGoal);
  data = addContribution(data, pcGoal, { amountCents: 300000, date: monthsAgo(1, 5), walletId: xp }).data;
  data = addContribution(data, pcGoal, { amountCents: 100000, date: monthsAgo(0, 2), walletId: xp }).data;

  const deadline = new Date();
  deadline.setMonth(deadline.getMonth() + 6);
  const { data: withTripGoal, id: tripGoal } = createGoal(data, {
    name: "Viagem de fim de ano",
    horizon: "long",
    targetCents: 500000,
    deadline: deadline.toISOString().slice(0, 10),
    color: "#4A8AB5",
  });
  data = withTripGoal;
  data = addContribution(data, tripGoal, { amountCents: 150000, date: monthsAgo(2, 1), walletId: xp }).data;
  data = addContribution(data, tripGoal, { amountCents: 100000, date: monthsAgo(0, 1), walletId: xp }).data;

  return data;
}

export function isDemoMode(): boolean {
  try {
    return localStorage.getItem(DEMO_FLAG) === "true";
  } catch {
    return false;
  }
}

export function setDemoMode(active: boolean): void {
  try {
    if (active) localStorage.setItem(DEMO_FLAG, "true");
    else localStorage.removeItem(DEMO_FLAG);
  } catch {
    /* ignore */
  }
}

/** True only on a genuinely empty, never-decided-on first visit — not
 *  already demoing, not already dismissed, no real ledger data yet. */
function hasRealLedgerData(): boolean {
  try {
    const raw = localStorage.getItem(LEDGER_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as Partial<LedgerData>;
    return (
      (parsed.wallets?.length ?? 0) > 0 ||
      (parsed.categories?.length ?? 0) > 0 ||
      (parsed.transactions?.length ?? 0) > 0 ||
      (parsed.goals?.length ?? 0) > 0
    );
  } catch {
    return false;
  }
}

export function shouldShowDemoPrompt(): boolean {
  try {
    const isDemo = localStorage.getItem(DEMO_FLAG) === "true";
    const dismissed = localStorage.getItem(DISMISSED_FLAG) === "true";
    return !hasRealLedgerData() && !isDemo && !dismissed;
  } catch {
    return false;
  }
}

export function dismissDemoPrompt(): void {
  try {
    localStorage.setItem(DISMISSED_FLAG, "true");
  } catch {
    /* ignore */
  }
}

export function clearDemoData(): void {
  try {
    localStorage.removeItem(LEDGER_KEY);
    localStorage.removeItem(DEMO_FLAG);
    localStorage.removeItem(DISMISSED_FLAG);
  } catch {
    /* ignore */
  }
}
