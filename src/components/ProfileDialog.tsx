import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Cloud, LogOut, MonitorSmartphone, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";
import { budgetStatus, currentYYYYMM, monthSummary } from "@/lib/ledger/service";
import { useLedger } from "@/lib/ledger/store";
import { useMoneyFormat, useT } from "@/lib/i18n/I18nProvider";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DUE_SOON_DAYS = 30;

/** A single-profile snapshot — no carousel/multi-slot switching: the suite
 *  account is one identity, and this dialog is its one home. */
export default function ProfileDialog({ open, onOpenChange }: Props) {
  const { session, signOut, updateName } = useAuth();
  const { data } = useLedger();
  const navigate = useNavigate();
  const t = useT();
  const L = t.pluto.profile;
  const money = useMoneyFormat();

  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState("");

  const cloud = !!session?.email;

  const month = currentYYYYMM();
  const summary = monthSummary(data, month);
  const overBudgetCount = budgetStatus(data, month).filter((b) => b.overBudget).length;
  const activeGoals = data.goals.filter((g) => !g.archivedAt);
  const today = new Date().toISOString().slice(0, 10);
  const dueSoon = activeGoals
    .filter((g) => g.deadline && g.deadline >= today)
    .map((g) => ({ goal: g, daysLeft: Math.round((new Date(`${g.deadline}T00:00:00`).getTime() - new Date(`${today}T00:00:00`).getTime()) / 86_400_000) }))
    .filter((g) => g.daysLeft <= DUE_SOON_DAYS)
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 4);

  function startEditing() {
    setNameDraft(session?.name ?? "");
    setEditing(true);
  }
  function saveName() {
    const trimmed = nameDraft.trim();
    if (trimmed) void updateName(trimmed);
    setEditing(false);
  }

  if (!session) return null;
  const initial = session.name.trim().charAt(0).toUpperCase() || "P";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 overflow-hidden border-sidebar-border bg-sidebar p-0 text-sidebar-foreground">
        <div className="p-4 pb-3">
          <div className="flex items-center gap-3">
            <div className="font-display grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gold text-base font-semibold text-primary-deep">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              {editing ? (
                <div className="flex items-center gap-1.5">
                  <input
                    autoFocus
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") saveName(); if (e.key === "Escape") setEditing(false); }}
                    className="w-36 rounded border border-sidebar-border bg-sidebar-accent/60 px-2 py-0.5 font-display text-sm text-sidebar-accent-foreground outline-none"
                  />
                  <button onClick={saveName} className="p-0.5 text-secondary hover:text-secondary/80"><Check className="h-3 w-3" /></button>
                  <button onClick={() => setEditing(false)} className="p-0.5 text-sidebar-foreground/50 hover:text-sidebar-foreground/80"><X className="h-3 w-3" /></button>
                </div>
              ) : (
                <div className="group flex items-center gap-2">
                  <span className="font-display truncate text-sm text-sidebar-accent-foreground">{session.name}</span>
                  <button onClick={startEditing} className="p-0.5 text-sidebar-foreground/40 opacity-0 transition-all hover:text-secondary/80 group-hover:opacity-100">
                    <Pencil className="h-2.5 w-2.5" />
                  </button>
                </div>
              )}
              <div className="flex items-center gap-1 text-[10px] uppercase tracking-[0.14em] text-sidebar-foreground/50">
                {cloud ? <Cloud className="h-2.5 w-2.5" /> : <MonitorSmartphone className="h-2.5 w-2.5" />}
                {cloud ? t.common.suiteAccount : t.common.thisBrowser}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3 px-4 pb-4">
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg border border-sidebar-border bg-sidebar-accent/30 p-2.5 text-center">
              <div className="text-[9px] uppercase tracking-wider text-sidebar-foreground/50">{L.netBalance}</div>
              <div className={cn("font-display num mt-0.5 text-sm text-sidebar-accent-foreground", summary.netCents < 0 && "text-destructive")}>
                {money.format(summary.netCents)}
              </div>
            </div>
            <div className="rounded-lg border border-sidebar-border bg-sidebar-accent/30 p-2.5 text-center">
              <div className="text-[9px] uppercase tracking-wider text-sidebar-foreground/50">{L.activeGoals}</div>
              <div className="font-display num mt-0.5 text-base text-sidebar-accent-foreground">{activeGoals.length}</div>
            </div>
            <div className="rounded-lg border border-sidebar-border bg-sidebar-accent/30 p-2.5 text-center">
              <div className="text-[9px] uppercase tracking-wider text-sidebar-foreground/50">{L.overBudget}</div>
              <div className={cn("font-display num mt-0.5 text-base text-sidebar-accent-foreground", overBudgetCount > 0 && "text-destructive")}>
                {overBudgetCount}
              </div>
            </div>
          </div>

          {dueSoon.length > 0 && (
            <div>
              <div className="mb-1.5 text-[10px] uppercase tracking-wider text-sidebar-foreground/50">{L.dueSoon}</div>
              <div className="flex flex-wrap gap-1.5">
                {dueSoon.map(({ goal, daysLeft }) => (
                  <span
                    key={goal.id}
                    className="inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[11px]"
                    style={{ backgroundColor: `${goal.color}16`, borderColor: `${goal.color}33`, color: goal.color }}
                  >
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: goal.color }} />
                    <span className="max-w-[7rem] truncate text-sidebar-accent-foreground">{goal.name}</span>
                    <span className="num shrink-0">{L.daysLeft(daysLeft)}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          <Button
            variant="outline"
            className="h-9 w-full bg-sidebar/50 text-xs"
            style={{ borderColor: "rgba(178,58,46,0.4)", color: "rgba(224,120,105,1)" }}
            onClick={() => { void signOut(); navigate("/login"); onOpenChange(false); }}
          >
            <LogOut className="mr-1.5 h-3.5 w-3.5" /> {t.common.signOut}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
