import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowUpRight, CheckCircle2, Sparkles, TrendingUp, type LucideIcon } from "lucide-react";
import { heuristicInsight, type Insight } from "@/lib/ledger/insights";
import { aiHeadlineInsight } from "@/lib/ai/insight";
import { useLedger } from "@/lib/ledger/store";
import { useI18n, useMoneyFormat, useT } from "@/lib/i18n/I18nProvider";
import { LOCALE_LABELS, type Dictionary } from "@/lib/i18n/dictionaries";
import { cn } from "@/lib/utils";

interface AetherisInsightCardProps {
  month: string;
}

type Resolved = {
  title: string;
  body: string | null;
  severity: "warning" | "positive";
  Icon: LucideIcon;
  generatedBy: "ai" | "heuristic";
};

function resolveHeuristic(
  insight: Insight,
  data: ReturnType<typeof useLedger>["data"],
  L: Dictionary["pluto"]["insights"],
  money: ReturnType<typeof useMoneyFormat>,
): Resolved {
  switch (insight.kind) {
    case "over-budget": {
      const category = data.categories.find((c) => c.id === insight.categoryId);
      return {
        title: L.overBudgetTitle(category?.name ?? ""),
        body: L.overBudgetBody(money.format(insight.overCents)),
        severity: "warning",
        Icon: AlertTriangle,
        generatedBy: "heuristic",
      };
    }
    case "goal-deadline": {
      const goal = data.goals.find((g) => g.id === insight.goalId);
      return {
        title: L.goalDeadlineTitle(goal?.name ?? "", insight.daysLeft),
        body: L.goalDeadlineBody(insight.progressPct),
        severity: "warning",
        Icon: AlertTriangle,
        generatedBy: "heuristic",
      };
    }
    case "goal-close": {
      const goal = data.goals.find((g) => g.id === insight.goalId);
      return {
        title: L.goalCloseTitle(goal?.name ?? ""),
        body: L.goalCloseBody(insight.progressPct),
        severity: "positive",
        Icon: TrendingUp,
        generatedBy: "heuristic",
      };
    }
    case "net-negative":
      return {
        title: L.netNegativeTitle,
        body: L.netNegativeBody(money.format(Math.abs(insight.amountCents))),
        severity: "warning",
        Icon: AlertTriangle,
        generatedBy: "heuristic",
      };
    case "net-improved":
      return {
        title: L.netImprovedTitle(insight.pctChange),
        body: L.netImprovedBody,
        severity: "positive",
        Icon: TrendingUp,
        generatedBy: "heuristic",
      };
    case "all-clear":
      return {
        title: L.allClearTitle,
        body: L.allClearBody,
        severity: "positive",
        Icon: CheckCircle2,
        generatedBy: "heuristic",
      };
  }
}

/** One insight (AI-narrated when available, the deterministic heuristic
 *  otherwise) + a link into the chat. Paints instantly from the heuristic
 *  (zero-latency, always available) and silently upgrades to the AI version
 *  in the background if it resolves before the inputs change again — the
 *  dashboard never blocks on a network round-trip, but reflects the richer
 *  read when it's there. A small badge names which one is actually showing,
 *  same "AI"/"Structural" convention Chronos' digest cards use. */
export default function AetherisInsightCard({ month }: AetherisInsightCardProps) {
  const { data } = useLedger();
  const money = useMoneyFormat();
  const t = useT();
  const { locale } = useI18n();
  const L = t.pluto.insights;

  const heuristic = useMemo(
    () => resolveHeuristic(heuristicInsight(data, month), data, L, money),
    [data, month, L, money],
  );
  const [resolved, setResolved] = useState<Resolved>(heuristic);

  useEffect(() => {
    setResolved(heuristic);
    let cancelled = false;
    aiHeadlineInsight(data, month, LOCALE_LABELS[locale].long).then((ai) => {
      if (cancelled || !ai) return;
      setResolved({
        title: ai.title,
        body: ai.body,
        severity: ai.severity,
        Icon: ai.severity === "positive" ? TrendingUp : AlertTriangle,
        generatedBy: "ai",
      });
    });
    return () => {
      cancelled = true;
    };
    // `heuristic` is derived from the same deps already listed — re-running
    // this effect whenever it changes is exactly the intent (re-paint the
    // instant fallback, then re-attempt the AI upgrade).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, month, locale]);

  const { title, body, severity, Icon, generatedBy } = resolved;

  return (
    <div className="pluto-card-elevated relative overflow-hidden p-3">
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-secondary/10 blur-2xl" />
      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="grid h-8 w-8 place-items-center rounded-md bg-gold shadow-gold">
            <Sparkles className="h-4 w-4 text-primary-deep" />
          </div>
          <div className="text-sm font-medium text-primary">Aetheris</div>
          <span
            className={cn(
              "rounded-full px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider",
              generatedBy === "ai" ? "bg-secondary/15 text-secondary" : "bg-muted-foreground/10 text-muted-foreground/60",
            )}
            title={generatedBy === "ai" ? L.aiBadge : L.heuristicBadge}
          >
            {generatedBy === "ai" ? L.aiBadge : L.heuristicBadge}
          </span>
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
