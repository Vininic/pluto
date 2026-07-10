import { useState } from "react";
import { format } from "date-fns";
import { Check, ExternalLink, Loader2, Pencil, Plus, Sparkles, Target, Trash2 } from "lucide-react";
import GoalDialog from "@/components/GoalDialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { estimateItemPriceCents } from "@/lib/ai/priceEstimate";
import { goalProgress } from "@/lib/ledger/service";
import { useLedger } from "@/lib/ledger/store";
import type { Goal } from "@/lib/ledger/types";
import { parseMoneyInput } from "@/lib/money";
import { useDateFormat, useMoneyFormat, useT } from "@/lib/i18n/I18nProvider";
import { cn } from "@/lib/utils";

interface GoalDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal: Goal | null;
}

export default function GoalDetailDialog({ open, onOpenChange, goal }: GoalDetailDialogProps) {
  const { data, addGoalItem, updateGoalItem, deleteGoalItem, setGoalTargetFromItems, addContribution, deleteContribution, deleteGoal } = useLedger();
  const money = useMoneyFormat();
  const fmt = useDateFormat();
  const t = useT();
  const L = t.pluto.goals;
  const [editOpen, setEditOpen] = useState(false);
  const [itemName, setItemName] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [contribAmount, setContribAmount] = useState("");
  const [contribWalletId, setContribWalletId] = useState("");
  const [estimatingNewItem, setEstimatingNewItem] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingPriceDraft, setEditingPriceDraft] = useState("");
  const [estimatingItemId, setEstimatingItemId] = useState<string | null>(null);
  const [aiEstimated, setAiEstimated] = useState(false);

  if (!goal) return null;
  const progress = goalProgress(data, goal.id);
  const contributions = data.contributions.filter((c) => c.goalId === goal.id).sort((a, b) => b.date.localeCompare(a.date));
  const wallets = data.wallets.filter((w) => !w.archivedAt);
  const pct = progress && goal.targetCents > 0 ? Math.min(100, progress.progressPct) : 0;

  function addItem() {
    const priceCents = parseMoneyInput(itemPrice) ?? 0;
    if (!itemName.trim()) return;
    addGoalItem(goal!.id, { name: itemName.trim(), priceCents });
    setItemName("");
    setItemPrice("");
    setAiEstimated(false);
  }

  async function estimateForNewItem() {
    if (!itemName.trim()) return;
    setEstimatingNewItem(true);
    try {
      const cents = await estimateItemPriceCents(itemName.trim());
      if (cents !== null) {
        setItemPrice((cents / 100).toFixed(2).replace(".", ","));
        setAiEstimated(true);
      }
    } finally {
      setEstimatingNewItem(false);
    }
  }

  function startEditingPrice(itemId: string, currentCents: number) {
    setEditingItemId(itemId);
    setEditingPriceDraft(currentCents > 0 ? (currentCents / 100).toFixed(2).replace(".", ",") : "");
  }

  function commitEditingPrice() {
    if (editingItemId) {
      const cents = parseMoneyInput(editingPriceDraft);
      if (cents !== null && cents >= 0) updateGoalItem(goal!.id, editingItemId, { priceCents: cents });
    }
    setEditingItemId(null);
  }

  async function estimateForExistingItem(itemId: string, name: string) {
    setEstimatingItemId(itemId);
    try {
      const cents = await estimateItemPriceCents(name);
      if (cents !== null) {
        setEditingItemId(itemId);
        setEditingPriceDraft((cents / 100).toFixed(2).replace(".", ","));
      }
    } finally {
      setEstimatingItemId(null);
    }
  }

  function contribute() {
    const amountCents = parseMoneyInput(contribAmount);
    if (!amountCents || amountCents <= 0) return;
    addContribution(goal!.id, { amountCents, date: format(new Date(), "yyyy-MM-dd"), walletId: contribWalletId || undefined });
    setContribAmount("");
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full" style={{ background: goal.color }} />
              <DialogTitle className="font-display text-xl">{goal.name}</DialogTitle>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" onClick={() => setEditOpen(true)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button size="icon" variant="ghost" className="ml-auto h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => { deleteGoal(goal.id); onOpenChange(false); }}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </DialogHeader>

          <div className="space-y-6">
            <section>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{L.progress}</span>
                <span className="num font-medium text-primary">{money.format(progress?.contributedCents ?? 0)} / {money.format(goal.targetCents)}</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-secondary" style={{ width: `${pct}%` }} />
              </div>
              {goal.deadline && <div className="mt-1.5 text-[11px] text-muted-foreground">{L.deadline}: {fmt.medium(goal.deadline)}</div>}
              {goal.items.length > 0 && progress && (
                <div className="num mt-1.5 text-[11px] text-muted-foreground">
                  {L.doneItems}: {money.format(progress.doneItemsCents)} / {L.itemizedSum}: {money.format(progress.itemizedSumCents)}
                </div>
              )}
            </section>

            <section>
              <div className="flex items-center justify-between">
                <Label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{L.items}</Label>
                {goal.items.length > 0 && (
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setGoalTargetFromItems(goal!.id)}>
                    <Target className="mr-1 h-3 w-3" /> {L.setTargetFromItems}
                  </Button>
                )}
              </div>
              <div className="mt-2 space-y-1.5">
                {goal.items.map((item) => (
                  <div key={item.id} className="rounded-md border border-border/60 bg-surface-raised p-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateGoalItem(goal!.id, item.id, { done: !item.done })}
                        className={cn("grid h-5 w-5 shrink-0 place-items-center rounded-full border", item.done ? "border-secondary bg-secondary text-primary-deep" : "border-border")}
                      >
                        {item.done && <Check className="h-3 w-3" />}
                      </button>
                      <span className={cn("flex-1 truncate text-sm", item.done && "text-muted-foreground line-through")}>{item.name}</span>
                      {item.url && (
                        <a href={item.url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-secondary">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                      {editingItemId === item.id ? (
                        <Input
                          autoFocus
                          value={editingPriceDraft}
                          onChange={(e) => setEditingPriceDraft(e.target.value)}
                          onBlur={commitEditingPrice}
                          onKeyDown={(e) => { if (e.key === "Enter") commitEditingPrice(); if (e.key === "Escape") setEditingItemId(null); }}
                          placeholder="0,00"
                          inputMode="decimal"
                          className="h-7 w-24 text-right"
                        />
                      ) : (
                        <button type="button" onClick={() => startEditingPrice(item.id, item.priceCents)} className="num text-sm text-muted-foreground hover:text-primary">
                          {money.format(item.priceCents)}
                        </button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 shrink-0 text-muted-foreground hover:text-secondary"
                        title={L.estimateWithAi}
                        disabled={estimatingItemId === item.id}
                        onClick={() => void estimateForExistingItem(item.id, item.name)}
                      >
                        {estimatingItemId === item.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                      </Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => deleteGoalItem(goal!.id, item.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    {editingItemId === item.id && <div className="ml-7 mt-1 text-[10px] text-muted-foreground">{L.aiEstimateCaption}</div>}
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <Input value={itemName} onChange={(e) => setItemName(e.target.value)} placeholder={L.itemName} className="h-8 flex-1" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addItem(); } }} />
                  <Input value={itemPrice} onChange={(e) => { setItemPrice(e.target.value); setAiEstimated(false); }} placeholder="0,00" inputMode="decimal" className="h-8 w-24" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addItem(); } }} />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-secondary"
                    title={L.estimateWithAi}
                    disabled={!itemName.trim() || estimatingNewItem}
                    onClick={() => void estimateForNewItem()}
                  >
                    {estimatingNewItem ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={addItem} disabled={!itemName.trim()}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {aiEstimated && <div className="text-[10px] text-muted-foreground">{L.aiEstimateCaption}</div>}
              </div>
            </section>

            <section>
              <Label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{L.contributions}</Label>
              <div className="mt-2 space-y-1.5">
                {contributions.map((c) => (
                  <div key={c.id} className="flex items-center gap-2 rounded-md border border-border/60 bg-surface-raised p-2 text-sm">
                    <span className="num flex-1">{fmt.short(c.date)}</span>
                    <span className="num font-medium text-primary">{money.format(c.amountCents)}</span>
                    <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => deleteContribution(c.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <Input value={contribAmount} onChange={(e) => setContribAmount(e.target.value)} placeholder="0,00" inputMode="decimal" className="h-8 flex-1" onKeyDown={(e) => { if (e.key === "Enter") contribute(); }} />
                  <Select value={contribWalletId} onValueChange={setContribWalletId}>
                    <SelectTrigger className="h-8 w-40"><SelectValue placeholder={L.contributeWallet} /></SelectTrigger>
                    <SelectContent>
                      {wallets.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button size="sm" onClick={contribute} disabled={!contribAmount.trim()} className="bg-primary text-primary-foreground hover:bg-primary-deep">
                    {L.contribute}
                  </Button>
                </div>
              </div>
            </section>
          </div>
        </DialogContent>
      </Dialog>

      <GoalDialog open={editOpen} onOpenChange={setEditOpen} goal={goal} />
    </>
  );
}
