# Pluto

**The financial pillar of the Olympus Suite.**

React + TypeScript · local-first · optional cloud sync via the shared suite backend

*Pluto, lord of the underworld's stored wealth. Chronos architects your hours, Kairos moves your work — Pluto guards what it earns.* Wallets, budgets and goals with real part lists, a triage board for uncategorized transactions, and Aetheris with statement-photo import.

Live: **[pluto-suite.vercel.app](https://pluto-suite.vercel.app)**

---

## The suite connection

Pluto is a sibling app, not a module. It shares with Chronos and Kairos:

- **The account.** All three apps point at the same Supabase project — one email/password works across the suite, and the local "guest" mode works with no account at all.
- **The backend.** The ledger syncs as one row in the same `user_data` KV table Chronos and Kairos already use (RLS-scoped per user, zero new migrations).
- **The design language.** Same parchment surfaces, Fraunces + Inter type, card system, shadows and motion — but where Chronos is midnight blue + bronze and Kairos is twilight plum + rose-gold, Pluto is **Vault green + gold**: the ledger's depth and the coin that moves through it. The mark is a coin/medallion (circle + inner ring), and the 3D anchor is a slow-rotating faceted medallion — green glass body, gold metal rim.
- **Aetheris.** The one suite assistant, wearing a finance hat here: nine actions (log a transaction, categorize, set a budget, create/fund a goal, create a wallet/category), confirm-first by default, plus statement-photo import (a photo of a bank statement becomes proposed transactions, reviewed before anything touches the ledger).

## Features

- **Wallets** — cash/checking/savings/credit, balance derived from transactions, wallet-to-wallet transfers
- **Transactions** — filterable list, inline quick-add, full edit dialog
- **Triage** — a drag-and-drop board (native HTML5 DnD, same mechanics as Kairos' board) for sorting uncategorized transactions into categories
- **Budgets** — a recurring monthly ceiling per expense category, with a spent/remaining/over-budget bar
- **Goals** — short/long horizon, itemized part lists with price and link, contributions, "use the itemized sum as the target"
- **Dashboard** — net balance, a 12-month evolution chart, top expenses, budget and goal summaries, and a heuristic (zero-AI) Aetheris insight card
- **Reports** — a monthly report viewer (summary, category table, budget review, goals delta), an optional AI narrative, history, and delivery: send now via an interim mailer, or queue for Hermes once it exists
- **Local-first**: everything lives in `localStorage`; a cloud sign-in adds debounced push, pull-on-login and realtime cross-device convergence — remote changes re-hydrate the ledger in place, no reload

## Architecture

```
src/
├─ lib/ledger/    # domain core: types, pure service (CRUD + queries + migrate), store, insights
├─ lib/ai/        # Aetheris: providers, context builder, action vocabulary, statement-photo import
├─ lib/reports/   # report generation, history, AI narrative, hermes-outbox writer, interim mailer
├─ lib/sync/      # localStorage ⇄ Supabase user_data mirror (single domain)
├─ lib/supabase/  # shared-suite client (namespaced local session)
├─ lib/auth.tsx   # cloud account or local guest — same contract as Chronos/Kairos
├─ components/    # dialogs (Wallet/Category/Transaction/Goal), charts, the 3D medallion
└─ pages/         # Landing, Login, Dashboard, Transactions, Triage, Wallets, Budgets, Goals, Reports, Aetheris, Settings, About
```

Design rule inherited from the siblings: **pure functions own the domain, the store is a thin wrapper, renderers are generic.** All ledger mutations and every derived number (balances, month summaries, budget status, goal progress) live in `lib/ledger/service.ts` and are covered by a 41-test Vitest suite. Money is always integer cents — never floats.

## Running locally

Requirements: **Node 20+**, **pnpm** via Corepack.

```bash
corepack pnpm install
corepack pnpm dev        # → http://localhost:8100
corepack pnpm test       # domain test suite (41 tests)
corepack pnpm typecheck  # tsc --noEmit
corepack pnpm build      # production build
```

Runs fully offline with no configuration. To enable the suite account, copy `.env.example` to `.env` and point it at the same Supabase project as Chronos/Kairos (anon key + URL are client-safe; RLS does the enforcement).

### Shared infra this app depends on

Two Supabase Edge Functions in `chronos-audit/supabase/functions/`, both deployed:

- **`ai-proxy`** — the suite's shared AI proxy (free hosted Gemini by default). Pluto's statement-photo import needs its `images` field, which is live.
- **`report-mailer`** — Pluto's interim "Send report now" delivery. Deployed, but needs a `RESEND_API_KEY` secret set (Resend free tier) before it actually sends email — until then it fails with a clear "not configured" error.

---

*Local-first by design: your finances live in the browser. Cloud sync is opt-in and rides the suite's existing backend.*
