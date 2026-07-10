import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Loader2, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { buildProposal, downscaleToJpegBase64, extractTransactionsFromImages, type ProposedRow } from "@/lib/ai/imageImport";
import { useLedger } from "@/lib/ledger/store";
import { makeId } from "@/lib/ledger/types";
import { useDateFormat, useMoneyFormat, useT } from "@/lib/i18n/I18nProvider";
import { cn } from "@/lib/utils";

interface StatementImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const NONE_CATEGORY = "__none__";

export default function StatementImportDialog({ open, onOpenChange }: StatementImportDialogProps) {
  const { data, createTransaction } = useLedger();
  const money = useMoneyFormat();
  const fmt = useDateFormat();
  const t = useT();
  const L = t.pluto.statementImport;
  const fileRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const wallets = data.wallets.filter((w) => !w.archivedAt);
  const [walletId, setWalletId] = useState(wallets[0]?.id ?? "");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<ProposedRow[] | null>(null);

  function reset() {
    setRows(null);
    setLoading(false);
  }

  async function pickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;
    e.target.value = "";
    setLoading(true);
    try {
      const images = await Promise.all(Array.from(files).map(downscaleToJpegBase64));
      const extracted = await extractTransactionsFromImages(images);
      if (extracted.length === 0) {
        toast(L.noneFound);
        setRows([]);
      } else {
        setRows(buildProposal(data, extracted));
      }
    } catch (err) {
      toast(L.extractFailed, { description: err instanceof Error ? err.message : undefined });
      setRows(null);
    } finally {
      setLoading(false);
    }
  }

  function toggleRow(id: string) {
    setRows((prev) => prev?.map((r) => (r.id === id ? { ...r, selected: !r.selected } : r)) ?? null);
  }

  function setRowCategory(id: string, categoryId: string) {
    setRows((prev) => prev?.map((r) => (r.id === id ? { ...r, categoryId: categoryId === NONE_CATEGORY ? undefined : categoryId } : r)) ?? null);
  }

  function selectAll(selected: boolean) {
    setRows((prev) => prev?.map((r) => ({ ...r, selected })) ?? null);
  }

  function importSelected() {
    if (!rows || !walletId) return;
    const selected = rows.filter((r) => r.selected);
    if (selected.length === 0) return;
    const importBatchId = makeId();
    let uncategorized = 0;
    for (const row of selected) {
      if (!row.categoryId) uncategorized += 1;
      createTransaction({
        walletId,
        categoryId: row.categoryId,
        type: row.direction === "in" ? "income" : "expense",
        amountCents: row.amountCents,
        date: row.date,
        description: row.description,
        source: "ai-import",
        importBatchId,
      });
    }
    if (uncategorized > 0) {
      toast(L.importedWithUncategorized(selected.length, uncategorized), {
        action: { label: L.reviewUncategorized, onClick: () => { navigate("/transactions", { state: { presetCategory: "uncategorized" } }); } },
      });
    } else {
      toast(L.imported(selected.length));
    }
    onOpenChange(false);
  }

  const selectedCount = rows?.filter((r) => r.selected).length ?? 0;

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{L.title}</DialogTitle>
        </DialogHeader>

        {!rows ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{L.description}</p>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{L.wallet}</Label>
              <Select value={walletId} onValueChange={setWalletId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {wallets.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple hidden onChange={(e) => void pickFiles(e)} />
            <Button
              onClick={() => fileRef.current?.click()}
              disabled={loading || !walletId}
              className="w-full bg-primary text-primary-foreground hover:bg-primary-deep"
            >
              {loading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Receipt className="mr-1.5 h-4 w-4" />}
              {loading ? L.extracting : L.attach}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-primary">{L.reviewTitle}</p>
              <div className="flex gap-2 text-xs">
                <button className="text-secondary hover:underline" onClick={() => selectAll(true)}>{L.selectAll}</button>
                <button className="text-muted-foreground hover:underline" onClick={() => selectAll(false)}>{L.deselectAll}</button>
              </div>
            </div>
            <div className="space-y-1.5">
              {rows.map((row) => (
                <div key={row.id} className={cn("flex items-center gap-2 rounded-md border border-border/60 bg-surface-raised p-2", row.duplicate && "border-destructive/30")}>
                  <input type="checkbox" checked={row.selected} onChange={() => toggleRow(row.id)} className="h-4 w-4 shrink-0 accent-secondary" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm text-card-foreground">{row.description}</span>
                      {row.duplicate && (
                        <span className="flex shrink-0 items-center gap-1 rounded-full bg-destructive/10 px-1.5 py-0.5 text-[9px] text-destructive">
                          <AlertTriangle className="h-2.5 w-2.5" /> {L.duplicateBadge}
                        </span>
                      )}
                    </div>
                    <div className="num text-[11px] text-muted-foreground">{fmt.short(row.date)}</div>
                  </div>
                  <Select value={row.categoryId ?? NONE_CATEGORY} onValueChange={(v) => setRowCategory(row.id, v)}>
                    <SelectTrigger className="h-8 w-36 shrink-0"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_CATEGORY}>{t.pluto.transactions.uncategorized}</SelectItem>
                      {data.categories.filter((c) => !c.archivedAt && c.kind === (row.direction === "in" ? "income" : "expense")).map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className={cn("num w-20 shrink-0 text-right text-sm font-medium", row.direction === "in" ? "text-emerald-600 dark:text-emerald-400" : "text-card-foreground")}>
                    {row.direction === "in" ? "+" : "-"}{money.format(row.amountCents)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter className="pt-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>{t.common.cancel}</Button>
          {rows && rows.length > 0 && (
            <Button onClick={importSelected} disabled={selectedCount === 0} className="bg-primary text-primary-foreground hover:bg-primary-deep">
              {L.import(selectedCount)}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
