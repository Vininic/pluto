import type { LucideIcon } from "lucide-react";
import { ArrowLeftRight, PiggyBank, Plus, Receipt, SlidersHorizontal, Tag, Target, Wallet as WalletIcon } from "lucide-react";
import { describeAction, findCategory, findGoal, findWallet, type AetherisAction } from "@/lib/ai/actions";
import { DEFAULT_CATEGORY_COLOR, DEFAULT_GOAL_COLOR, DEFAULT_WALLET_COLOR, type LedgerData } from "@/lib/ledger/types";
import type { Dictionary } from "@/lib/i18n/dictionaries";

const ACTION_ICONS: Record<AetherisAction["type"], LucideIcon> = {
  create_wallet: WalletIcon,
  create_category: Tag,
  add_transaction: Receipt,
  add_transactions: Receipt,
  categorize: Tag,
  set_budget: SlidersHorizontal,
  create_goal: Target,
  add_goal_item: Plus,
  contribute_to_goal: PiggyBank,
};

function resolveColor(data: LedgerData, action: AetherisAction): string {
  switch (action.type) {
    case "create_wallet":
      return action.color ?? DEFAULT_WALLET_COLOR;
    case "create_category":
      return action.color ?? DEFAULT_CATEGORY_COLOR;
    case "add_transaction":
      return (action.category && findCategory(data, action.category)?.color) || findWallet(data, action.wallet)?.color || DEFAULT_CATEGORY_COLOR;
    case "add_transactions":
      return DEFAULT_CATEGORY_COLOR;
    case "categorize":
    case "set_budget":
      return findCategory(data, action.category)?.color ?? DEFAULT_CATEGORY_COLOR;
    case "create_goal":
      return DEFAULT_GOAL_COLOR;
    case "add_goal_item":
    case "contribute_to_goal":
      return findGoal(data, action.goal)?.color ?? DEFAULT_GOAL_COLOR;
    default:
      return DEFAULT_CATEGORY_COLOR;
  }
}

interface ActionPillProps {
  action: AetherisAction;
  data: LedgerData;
  P: Dictionary["pluto"];
}

/** One proposed action as a colored chip — same visual language as the
 *  wallet/goal snapshot rows in Aetheris' sidebar (icon + colored dot +
 *  text), resolving color from the actually-referenced wallet/category/goal
 *  so a proposed change looks like the real thing it will create, instead
 *  of a generic bullet. Mirrors Chronos' BlockPill pattern (one shared
 *  color-resolution step feeding both real and proposed items) without
 *  needing a shared style function, since Pluto's chip vocabulary is
 *  simpler (a flat color per entity, no per-kind icon families). */
export default function ActionPill({ action, data, P }: ActionPillProps) {
  const Icon = ACTION_ICONS[action.type];
  const color = resolveColor(data, action);

  return (
    <div className="flex items-start gap-2 rounded-lg px-2.5 py-2" style={{ backgroundColor: `${color}16`, border: `1px solid ${color}33` }}>
      <div className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full" style={{ backgroundColor: `${color}33`, color }}>
        <Icon className="h-3 w-3" />
      </div>
      <span className="flex-1 text-sm text-card-foreground">{describeAction(data, action, P)}</span>
    </div>
  );
}
