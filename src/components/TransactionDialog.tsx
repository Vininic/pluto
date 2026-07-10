import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Plus, Trash2 } from "lucide-react";
import CategoryDialog from "@/components/CategoryDialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useLedger } from "@/lib/ledger/store";
import { TRANSACTION_TYPES, type Transaction, type TransactionType } from "@/lib/ledger/types";
import { parseMoneyInput } from "@/lib/money";
import { useT } from "@/lib/i18n/I18nProvider";

const NEW_CATEGORY = "__new__";
const NONE_CATEGORY = "__none__";

interface TransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction?: Transaction | null;
  /** Preselects a wallet — e.g. opened from that wallet's row. */
  defaultWalletId?: string;
}

export default function TransactionDialog({ open, onOpenChange, transaction, defaultWalletId }: TransactionDialogProps) {
  const { data, createTransaction, updateTransaction, deleteTransaction } = useLedger();
  const t = useT();
  const L = t.pluto.transactions;
  const [type, setType] = useState<TransactionType>("expense");
  const [walletId, setWalletId] = useState("");
  const [transferToWalletId, setTransferToWalletId] = useState("");
  const [categoryId, setCategoryId] = useState<string>(NONE_CATEGORY);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);

  const wallets = data.wallets.filter((w) => !w.archivedAt);
  const kind = type === "income" ? "income" : "expense";
  const categories = data.categories.filter((c) => !c.archivedAt && c.kind === kind);

  useEffect(() => {
    if (!open) return;
    setType(transaction?.type ?? "expense");
    setWalletId(transaction?.walletId ?? defaultWalletId ?? wallets[0]?.id ?? "");
    setTransferToWalletId(transaction?.transferToWalletId ?? "");
    setCategoryId(transaction?.categoryId ?? NONE_CATEGORY);
    setAmount(transaction ? (transaction.amountCents / 100).toFixed(2).replace(".", ",") : "");
    setDate(transaction?.date ?? format(new Date(), "yyyy-MM-dd"));
    setDescription(transaction?.description ?? "");
    setNotes(transaction?.notes ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, transaction]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const amountCents = parseMoneyInput(amount);
    if (!amountCents || amountCents <= 0 || !walletId) return;
    if (type === "transfer" && (!transferToWalletId || transferToWalletId === walletId)) return;

    const payload = {
      walletId,
      categoryId: type === "transfer" || categoryId === NONE_CATEGORY ? undefined : categoryId,
      type,
      amountCents,
      date,
      description: description.trim(),
      notes: notes.trim() || undefined,
      transferToWalletId: type === "transfer" ? transferToWalletId : undefined,
    };

    if (transaction) updateTransaction(transaction.id, payload);
    else createTransaction(payload);
    onOpenChange(false);
  }

  function remove() {
    if (transaction) deleteTransaction(transaction.id);
    onOpenChange(false);
  }

  const valid = walletId && (parseMoneyInput(amount) ?? 0) > 0 && date && (type !== "transfer" || (transferToWalletId && transferToWalletId !== walletId));

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">{transaction ? L.editTransaction : L.newTransaction}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{L.type}</Label>
              <Select value={type} onValueChange={(v) => { setType(v as TransactionType); setCategoryId(NONE_CATEGORY); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TRANSACTION_TYPES.map((tt) => <SelectItem key={tt} value={tt}>{L[tt]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{L.wallet}</Label>
                <Select value={walletId} onValueChange={setWalletId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {wallets.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {type === "transfer" ? (
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{L.transferTo}</Label>
                  <Select value={transferToWalletId} onValueChange={setTransferToWalletId}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {wallets.filter((w) => w.id !== walletId).map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{L.category}</Label>
                  <Select
                    value={categoryId}
                    onValueChange={(v) => (v === NEW_CATEGORY ? setCategoryDialogOpen(true) : setCategoryId(v))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_CATEGORY}>{L.uncategorized}</SelectItem>
                      {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      <SelectItem value={NEW_CATEGORY}>
                        <span className="flex items-center gap-1.5 text-secondary"><Plus className="h-3.5 w-3.5" /> {t.pluto.categories.newCategory}</span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="tx-amount" className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{L.amount}</Label>
                <Input id="tx-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tx-date" className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{L.date}</Label>
                <Input id="tx-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tx-desc" className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{L.description}</Label>
              <Input id="tx-desc" autoFocus value={description} onChange={(e) => setDescription(e.target.value)} placeholder={L.descriptionPlaceholder} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tx-notes" className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{L.notes}</Label>
              <Textarea id="tx-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>

            <DialogFooter className="items-center pt-2 sm:justify-between">
              {transaction ? (
                <Button type="button" variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={remove}>
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" /> {L.delete}
                </Button>
              ) : <span />}
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>{t.common.cancel}</Button>
                <Button type="submit" disabled={!valid} className="bg-primary text-primary-foreground hover:bg-primary-deep">
                  {t.common.save}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <CategoryDialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
        defaultKind={kind}
        onDone={(id) => setCategoryId(id)}
      />
    </>
  );
}
