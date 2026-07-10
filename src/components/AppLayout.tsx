import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  ArrowLeftRight, CircleHelp, Cloud, FileText, LayoutDashboard,
  MonitorSmartphone, PanelLeftClose, Settings2, Sparkles, Wallet,
} from "lucide-react";
import DemoPrompt from "@/components/DemoPrompt";
import Logo, { PlutoMark } from "@/components/PlutoLogo";
import ProfileDialog from "@/components/ProfileDialog";
import Topbar from "@/components/Topbar";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n/I18nProvider";
import { cn } from "@/lib/utils";

function UserBlock({ collapsed, onOpen }: { collapsed: boolean; onOpen: () => void }) {
  const { session } = useAuth();
  const t = useT();
  if (!session) return null;
  const cloud = !!session.email;
  const initial = session.name.trim().charAt(0).toUpperCase() || "P";

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg border border-sidebar-border bg-sidebar-accent/50 p-2.5 text-left transition-colors hover:bg-sidebar-accent",
        collapsed && "justify-center border-0 bg-transparent p-0 hover:bg-transparent",
      )}
    >
      <div className="font-display grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gold font-semibold text-primary-deep">
        {initial}
      </div>
      {!collapsed && (
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm text-sidebar-foreground">{session.name}</div>
          <div className="flex items-center gap-1 text-[10px] uppercase tracking-[0.14em] text-sidebar-foreground/55">
            {cloud ? <Cloud className="h-2.5 w-2.5" /> : <MonitorSmartphone className="h-2.5 w-2.5" />}
            {cloud ? t.common.suiteAccount : t.common.thisBrowser}
          </div>
        </div>
      )}
    </button>
  );
}

export default function AppLayout() {
  const { session } = useAuth();
  const t = useT();
  const nav = t.pluto.nav;
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const initial = session?.name.trim().charAt(0).toUpperCase() || "P";

  // Aetheris needs a real height chain (flex-1/h-full stretch to fill the
  // viewport) rather than the padded "grow with content, footer below" shape
  // every other page uses — a min-height wrapper breaks that chain in
  // Chromium (percentage/flex-1 heights inside it can't resolve to a
  // definite size). Mirrors the fix Kairos/Chronos already carry for their
  // own Aetheris/board routes — see ROADMAP.md Phase 0.
  const fullHeight = location.pathname === "/aetheris";

  const navClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors",
      isActive
        ? "bg-sidebar-accent text-sidebar-accent-foreground"
        : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
      collapsed && "justify-center px-0",
    );

  const ledger = [
    { to: "/dashboard", label: nav.dashboard, icon: LayoutDashboard },
    { to: "/transactions", label: nav.transactions, icon: ArrowLeftRight },
    { to: "/wallets", label: nav.wallets, icon: Wallet },
    { to: "/reports", label: nav.reports, icon: FileText },
  ];
  const system = [
    { to: "/settings", label: nav.settings, icon: Settings2 },
    { to: "/about", label: nav.about, icon: CircleHelp },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside
        className={cn(
          "hidden shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300 ease-in-out md:flex",
          collapsed ? "w-[72px]" : "w-60",
        )}
      >
        <div className={cn("flex items-center pt-5 pb-4", collapsed ? "justify-center px-0" : "justify-between px-5")}>
          {!collapsed && <Logo variant="light" />}
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? nav.expand : nav.collapse}
            className="grid h-7 w-7 place-items-center rounded-md text-sidebar-foreground/40 transition-all duration-300 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground/70"
          >
            <PanelLeftClose className={cn("h-4 w-4 transition-transform duration-300", collapsed && "rotate-180")} />
          </button>
        </div>
        {!collapsed && <div className="vault-rule mx-4" />}

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {ledger.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={navClass} title={collapsed ? label : undefined}>
              <Icon className="h-4 w-4 shrink-0 text-secondary-soft" />
              {!collapsed && <span className="flex-1">{label}</span>}
            </NavLink>
          ))}
          <NavLink to="/aetheris" className={navClass} title={collapsed ? nav.aetheris : undefined}>
            <Sparkles className="h-4 w-4 shrink-0 text-secondary-soft" />
            {!collapsed && <span>{nav.aetheris}</span>}
          </NavLink>

          <div className={cn("mb-2 mt-7 px-3 text-[10px] uppercase tracking-[0.22em] text-sidebar-foreground/50", collapsed && "hidden")}>
            {nav.system}
          </div>
          {system.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={navClass} title={collapsed ? label : undefined}>
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 pb-4 pt-2">
          <UserBlock collapsed={collapsed} onOpen={() => setProfileOpen(true)} />
        </div>
      </aside>

      <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
      <DemoPrompt />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between border-b border-sidebar-border bg-sidebar px-4 py-3 md:hidden">
          <NavLink to="/dashboard"><Logo variant="light" /></NavLink>
          <div className="flex items-center gap-2">
            <NavLink to="/aetheris" aria-label={nav.aetheris} className="grid h-8 w-8 place-items-center rounded-md text-sidebar-foreground/70 hover:bg-sidebar-accent">
              <Sparkles className="h-4 w-4" />
            </NavLink>
            <NavLink to="/settings" aria-label={nav.settings} className="grid h-8 w-8 place-items-center rounded-md text-sidebar-foreground/70 hover:bg-sidebar-accent">
              <Settings2 className="h-4 w-4" />
            </NavLink>
            <button
              type="button"
              aria-label={nav.profile}
              onClick={() => setProfileOpen(true)}
              className="font-display grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gold text-xs font-semibold text-primary-deep"
            >
              {initial}
            </button>
          </div>
        </header>

        <Topbar />

        <main className={cn("pluto-surface flex-1 overflow-y-auto", fullHeight && "flex flex-col overflow-hidden")}>
          {fullHeight ? (
            <div className="h-full min-h-0 p-5 lg:p-8">
              <Outlet />
            </div>
          ) : (
            <div className="flex min-h-full flex-col">
              <div className="flex-1 p-5 lg:p-8">
                <Outlet />
              </div>
              <footer className="flex items-center justify-center gap-2 py-6 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                <PlutoMark className="h-3.5 w-3.5 text-secondary" />
                {t.common.appName} · {t.common.suite}
              </footer>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
