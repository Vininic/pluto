import { useState } from "react";
import { ArrowLeftRight, Archive, ArchiveRestore, Coins, CreditCard, Landmark, PiggyBank, Plus, Trash2, Wallet as WalletIcon } from "lucide-react";
import TransferDialog from "@/components/TransferDialog";
import WalletDialog from "@/components/WalletDialog";
import { Button } from "@/components/ui/button";
import { canDeleteWallet, walletBalance } from "@/lib/ledger/service";
import { useLedger } from "@/lib/ledger/store";
import type { Wallet, WalletType } from "@/lib/ledger/types";
import { useMoneyFormat, useT } from "@/lib/i18n/I18nProvider";
import { cn } from "@/lib/utils";

const TYPE_ICONS: Record<WalletType, typeof WalletIcon> = {
  cash: WalletIcon,
  checking: Landmark,
  savings: PiggyBank,
  credit: CreditCard,
  crypto: Coins,
};

export default function Wallets() {
  const { data, archiveWallet, unarchiveWallet, deleteWallet } = useLedger();
  const money = useMoneyFormat();
  const t = useT();
  const L = t.pluto.wallets;
  const [dialog, setDialog] = useState<{ open: boolean; wallet: Wallet | null }>({ open: false, wallet: null });
  const [transferOpen, setTransferOpen] = useState(false);

  const active = data.wallets.filter((w) => !w.archivedAt);
  const archived = data.wallets.filter((w) => !!w.archivedAt);

  const balances = active.map((w) => ({ wallet: w, balance: walletBalance(data, w.id) }));
  const totalCents = balances.reduce((sum, b) => sum + b.balance, 0);
  const positiveTotal = balances.reduce((sum, b) => sum + Math.max(0, b.balance), 0);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-secondary">{L.eyebrow}</div>
          <h1 className="font-display mt-1.5 text-4xl text-primary">{L.title}</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setTransferOpen(true)} disabled={data.wallets.length < 2}>
            <ArrowLeftRight className="mr-1.5 h-4 w-4" /> {L.transfer}
          </Button>
          <Button className="bg-primary text-primary-foreground hover:bg-primary-deep" onClick={() => setDialog({ open: true, wallet: null })}>
            <Plus className="mr-1.5 h-4 w-4" /> {L.newWallet}
          </Button>
        </div>
      </header>

      {active.length > 1 && (
        <section className="pluto-card-elevated p-6">
          <div className="text-[11px] uppercase tracking-[0.22em] text-secondary">{L.totalBalance}</div>
          <div className={cn("font-display num mt-1 text-4xl", totalCents >= 0 ? "text-primary" : "text-destructive")}>
            {money.format(totalCents)}
          </div>
          {positiveTotal > 0 && (
            <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-muted">
              {balances.filter((b) => b.balance > 0).map((b) => (
                <div key={b.wallet.id} style={{ width: `${(b.balance / positiveTotal) * 100}%`, background: b.wallet.color }} title={b.wallet.name} />
              ))}
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
            {balances.map(({ wallet, balance }) => (
              <div key={wallet.id} className="flex items-center gap-1.5 text-xs">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: wallet.color }} />
                <span className="text-muted-foreground">{wallet.name}</span>
                <span className="num font-medium text-card-foreground">{money.format(balance)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {data.wallets.length === 0 ? (
        <p className="pluto-card p-8 text-center text-sm text-muted-foreground">{L.empty}</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...active, ...archived].map((wallet) => {
            const Icon = TYPE_ICONS[wallet.type];
            const balance = walletBalance(data, wallet.id);
            const deletable = canDeleteWallet(data, wallet.id);
            return (
              <div
                key={wallet.id}
                className={cn("pluto-card relative cursor-pointer overflow-hidden p-5 pl-6 transition-opacity", wallet.archivedAt && "opacity-60")}
                style={{ background: `${wallet.color}12`, borderColor: `${wallet.color}59` }}
                onClick={() => setDialog({ open: true, wallet })}
              >
                <span className="absolute bottom-1.5 left-0 top-1.5 w-[3px] rounded-full" style={{ background: wallet.color }} />
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg" style={{ background: `${wallet.color}22`, color: wallet.color }}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-primary">{wallet.name}</div>
                    <span
                      className="mt-0.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider"
                      style={{ background: `${wallet.color}22`, color: wallet.color }}
                    >
                      {t.pluto.walletTypes[wallet.type]}
                    </span>
                  </div>
                </div>
                <div
                  className={cn("num mt-4 text-2xl font-medium", balance < 0 && "text-destructive")}
                  style={balance >= 0 ? { color: wallet.color } : undefined}
                >
                  {money.format(balance)}
                </div>
                {wallet.archivedAt && <div className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">{L.archived}</div>}
                <div className="mt-4 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  {wallet.archivedAt ? (
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => unarchiveWallet(wallet.id)}>
                      <ArchiveRestore className="mr-1 h-3.5 w-3.5" /> {L.unarchive}
                    </Button>
                  ) : (
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => archiveWallet(wallet.id)}>
                      <Archive className="mr-1 h-3.5 w-3.5" /> {L.archive}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive disabled:opacity-40"
                    disabled={!deletable}
                    title={deletable ? undefined : L.deleteBlocked}
                    onClick={() => deleteWallet(wallet.id)}
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" /> {L.delete}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <WalletDialog open={dialog.open} onOpenChange={(open) => setDialog((s) => ({ ...s, open }))} wallet={dialog.wallet} />
      <TransferDialog open={transferOpen} onOpenChange={setTransferOpen} wallets={active} />
    </div>
  );
}
