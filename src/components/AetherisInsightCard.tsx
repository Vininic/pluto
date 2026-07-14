import { Link } from "react-router-dom";
import { AlertTriangle, ArrowUpRight, CheckCircle2, Sparkles, TrendingUp } from "lucide-react";
import { heuristicInsight } from "@/lib/ledger/insights";
import { useLedger } from "@/lib/ledger/store";
import { useMoneyFormat, useT } from "@/lib/i18n/I18nProvider";
import { cn } from "@/lib/utils";

interface AetherisInsightCardProps {
  month: string;
}

/** One heuristic insight (no AI call — computed locally) + a link into the
 *  chat, mirroring Chronos' `AetherisCard` shape: icon/title row, status
 *  badge, body, "ask Aetheris" link. */
export default function AetherisInsightCard({ month }: AetherisInsightCardProps) {
  const { data } = useLedger();
  const money = useMoneyFormat();
  const t = useT();
  const L = t.pluto.insights;
  const insight = heuristicInsight(data, month);

  let title: string;
  let body: string | null;
  let severity: "warning" | "positive";
  let Icon = Sparkles;

  switch (insight.kind) {
    case "over-budget": {
      const category = data.categories.find((c) => c.id === insight.categoryId);
      title = L.overBudgetTitle(category?.name ?? "");
      body = L.overBudgetBody(money.format(insight.overCents));
      severity = "warning";
      Icon = AlertTriangle;
      break;
    }
    case "goal-deadline": {
      const goal = data.goals.find((g) => g.id === insight.goalId);
      title = L.goalDeadlineTitle(goal?.name ?? "", insight.daysLeft);
      body = L.goalDeadlineBody(insight.progressPct);
      severity = "warning";
      Icon = AlertTriangle;
      break;
    }
    case "goal-close": {
      const goal = data.goals.find((g) => g.id === insight.goalId);
      title = L.goalCloseTitle(goal?.name ?? "");
      body = L.goalCloseBody(insight.progressPct);
      severity = "positive";
      Icon = TrendingUp;
      break;
    }
    case "net-negative":
      title = L.netNegativeTitle;
      body = L.netNegativeBody(money.format(Math.abs(insight.amountCents)));
      severity = "warning";
      Icon = AlertTriangle;
      break;
    case "net-improved":
      title = L.netImprovedTitle(insight.pctChange);
      body = L.netImprovedBody;
      severity = "positive";
      Icon = TrendingUp;
      break;
    case "all-clear":
      title = L.allClearTitle;
      body = L.allClearBody;
      severity = "positive";
      Icon = CheckCircle2;
      break;
  }

  return (
    <div className="pluto-card-elevated relative overflow-hidden p-3">
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-secondary/10 blur-2xl" />
      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="grid h-8 w-8 place-items-center rounded-md bg-gold shadow-gold">
            <Sparkles className="h-4 w-4 text-primary-deep" />
          </div>
          <div className="text-sm font-medium text-primary">Aetheris</div>
        </div>
        <span
          className={cn(
            "grid h-6 w-6 place-items-center rounded-full",
            severity === "warning" && "bg-destructive/15 text-destructive",
            severity === "positive" && "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400",
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
      </div>

      <div className="relative mt-2.5 border-t border-border/40 pt-2.5">
        <p className="text-sm font-medium text-card-foreground">{title}</p>
        {body && <p className="mt-1 text-sm text-muted-foreground">{body}</p>}
        <Link to="/aetheris" className="mt-2 inline-flex items-center gap-1 text-xs text-secondary hover:underline">
          {t.pluto.dashboard.askAetheris} <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
