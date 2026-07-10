import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLedger } from "@/lib/ledger/store";
import type { Wallet } from "@/lib/ledger/types";
import { parseMoneyInput } from "@/lib/money";
import { useT } from "@/lib/i18n/I18nProvider";

interface TransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wallets: Wallet[];
  defaultFromWalletId?: string;
}

export default function TransferDialog({ open, onOpenChange, wallets, defaultFromWalletId }: TransferDialogProps) {
  const { createTransaction } = useLedger();
  const t = useT();
  const L = t.pluto.wallets;
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (open) {
      setFromId(defaultFromWalletId ?? wallets[0]?.id ?? "");
      setToId(wallets.find((w) => w.id !== defaultFromWalletId)?.id ?? "");
      setAmount("");
      setDate(format(new Date(), "yyyy-MM-dd"));
      setDescription("");
    }
  }, [open, defaultFromWalletId, wallets]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const amountCents = parseMoneyInput(amount);
    if (!amountCents || amountCents <= 0 || !fromId || !toId || fromId === toId) return;
    createTransaction({
      walletId: fromId,
      transferToWalletId: toId,
      type: "transfer",
      amountCents,
      date,
      description: description.trim() || L.transfer,
    });
    onOpenChange(false);
  }

  const valid = fromId && toId && fromId !== toId && (parseMoneyInput(amount) ?? 0) > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{L.transferTitle}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{L.fromWallet}</Label>
              <Select value={fromId} onValueChange={setFromId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {wallets.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{L.toWallet}</Label>
              <Select value={toId} onValueChange={setToId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {wallets.filter((w) => w.id !== fromId).map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="transfer-amount" className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{L.amount}</Label>
            <Input id="transfer-amount" autoFocus inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="transfer-date" className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{L.date}</Label>
            <Input id="transfer-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="transfer-desc" className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{L.description}</Label>
            <Input id="transfer-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={L.descriptionPlaceholder} />
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>{t.common.cancel}</Button>
            <Button type="submit" disabled={!valid} className="bg-primary text-primary-foreground hover:bg-primary-deep">
              {L.transfer}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
