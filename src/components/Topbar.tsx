import { useLocation } from "react-router-dom";
import { ArrowLeftRight, CircleHelp, FileText, LayoutDashboard, Settings2, Sparkles, Wallet } from "lucide-react";
import { PlutoMark } from "@/components/PlutoLogo";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useT } from "@/lib/i18n/I18nProvider";

/** Suite-style persistent top bar — mirrors Chronos'/Kairos' Topbar placement
 *  convention: language and theme controls live here, on every page, never
 *  inside the sidebar. Route-aware breadcrumb; ledger stats (overdue budget
 *  alerts, etc.) join once the domain exists — see PLUTO.md M2/M3. */
export default function Topbar() {
  const location = useLocation();
  const t = useT();
  const nav = t.pluto.nav;

  const crumb =
    location.pathname === "/dashboard" ? { icon: LayoutDashboard, label: nav.dashboard } :
    location.pathname === "/transactions" ? { icon: ArrowLeftRight, label: nav.transactions } :
    location.pathname === "/wallets" ? { icon: Wallet, label: nav.wallets } :
    location.pathname === "/reports" ? { icon: FileText, label: nav.reports } :
    location.pathname === "/aetheris" ? { icon: Sparkles, label: nav.aetheris } :
    location.pathname === "/settings" ? { icon: Settings2, label: nav.settings } :
    location.pathname === "/about" ? { icon: CircleHelp, label: nav.about } :
    null;

  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card/70 px-4 backdrop-blur lg:px-6">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.22em] text-secondary md:hidden">
        <PlutoMark className="h-3.5 w-3.5" /> Pluto
      </div>

      {crumb && (
        <div className="hidden items-center gap-1.5 text-sm font-medium text-primary lg:flex">
          <crumb.icon className="h-3.5 w-3.5 text-secondary" /> {crumb.label}
        </div>
      )}

      <div className="ml-auto flex items-center gap-3">
        <LanguageToggle />
        <ThemeToggle />
      </div>
    </header>
  );
}
