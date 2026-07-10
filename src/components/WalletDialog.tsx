import { useEffect, useState } from "react";
import ColorPicker from "@/components/ColorPicker";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLedger } from "@/lib/ledger/store";
import { DEFAULT_WALLET_COLOR, WALLET_TYPES, type Wallet, type WalletType } from "@/lib/ledger/types";
import { useT } from "@/lib/i18n/I18nProvider";

interface WalletDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wallet?: Wallet | null;
}

export default function WalletDialog({ open, onOpenChange, wallet }: WalletDialogProps) {
  const { createWallet, updateWallet } = useLedger();
  const t = useT();
  const L = t.pluto.wallets;
  const [name, setName] = useState("");
  const [type, setType] = useState<WalletType>("cash");
  const [color, setColor] = useState(DEFAULT_WALLET_COLOR);

  useEffect(() => {
    if (open) {
      setName(wallet?.name ?? "");
      setType(wallet?.type ?? "cash");
      setColor(wallet?.color ?? DEFAULT_WALLET_COLOR);
    }
  }, [open, wallet]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    if (wallet) updateWallet(wallet.id, { name: name.trim(), type, color });
    else createWallet({ name, type, color });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{wallet ? L.editWallet : L.newWallet}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="wallet-name" className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{L.name}</Label>
            <Input id="wallet-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder={L.namePlaceholder} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{L.type}</Label>
            <Select value={type} onValueChange={(v) => setType(v as WalletType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {WALLET_TYPES.map((wt) => (
                  <SelectItem key={wt} value={wt}>{t.pluto.walletTypes[wt]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{L.color}</Label>
            <ColorPicker value={color} onChange={setColor} />
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>{t.common.cancel}</Button>
            <Button type="submit" disabled={!name.trim()} className="bg-primary text-primary-foreground hover:bg-primary-deep">
              {t.common.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
