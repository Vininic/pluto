import { useEffect, useState } from "react";
import ColorPicker from "@/components/ColorPicker";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLedger } from "@/lib/ledger/store";
import { DEFAULT_GOAL_COLOR, GOAL_HORIZONS, type Goal, type GoalHorizon } from "@/lib/ledger/types";
import { parseMoneyInput } from "@/lib/money";
import { useT } from "@/lib/i18n/I18nProvider";

interface GoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal?: Goal | null;
}

export default function GoalDialog({ open, onOpenChange, goal }: GoalDialogProps) {
  const { createGoal, updateGoal } = useLedger();
  const t = useT();
  const L = t.pluto.goals;
  const [name, setName] = useState("");
  const [horizon, setHorizon] = useState<GoalHorizon>("short");
  const [target, setTarget] = useState("");
  const [deadline, setDeadline] = useState("");
  const [color, setColor] = useState(DEFAULT_GOAL_COLOR);

  useEffect(() => {
    if (open) {
      setName(goal?.name ?? "");
      setHorizon(goal?.horizon ?? "short");
      setTarget(goal ? (goal.targetCents / 100).toFixed(2).replace(".", ",") : "");
      setDeadline(goal?.deadline ?? "");
      setColor(goal?.color ?? DEFAULT_GOAL_COLOR);
    }
  }, [open, goal]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const targetCents = parseMoneyInput(target) ?? 0;
    if (goal) updateGoal(goal.id, { name: name.trim(), horizon, targetCents, deadline: deadline || undefined, color });
    else createGoal({ name, horizon, targetCents, deadline: deadline || undefined, color });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{goal ? L.editGoal : L.newGoal}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="goal-name" className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{L.name}</Label>
            <Input id="goal-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder={L.namePlaceholder} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{L.horizon}</Label>
              <Select value={horizon} onValueChange={(v) => setHorizon(v as GoalHorizon)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {GOAL_HORIZONS.map((h) => <SelectItem key={h} value={h}>{L[h]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="goal-deadline" className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{L.deadline}</Label>
              <Input id="goal-deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="goal-target" className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{L.target}</Label>
            <Input id="goal-target" inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="0,00" />
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
