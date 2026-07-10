import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { dismissDemoPrompt, generateDemoData, setDemoMode, shouldShowDemoPrompt } from "@/lib/demo/generator";
import { useLedger } from "@/lib/ledger/store";
import { useT } from "@/lib/i18n/I18nProvider";

/** Shown once, on first visit with no ledger data — mostly for portfolio
 *  reviewers who land on an empty app and can't evaluate anything past the
 *  Dashboard. Mirrors Chronos' `DemoPrompt.tsx`. */
export default function DemoPrompt() {
  const { replaceLedger } = useLedger();
  const navigate = useNavigate();
  const t = useT();
  const L = t.pluto.demo;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (shouldShowDemoPrompt()) setVisible(true);
  }, []);

  if (!visible) return null;

  function loadDemo() {
    replaceLedger(generateDemoData());
    setDemoMode(true);
    setVisible(false);
    navigate("/dashboard");
  }

  function startFresh() {
    dismissDemoPrompt();
    setVisible(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
      <div className="pluto-card-elevated w-full max-w-md space-y-4 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-secondary/20">
              <Sparkles className="h-5 w-5 text-secondary" />
            </div>
            <h2 className="font-display text-lg text-primary">{L.title}</h2>
          </div>
          <button onClick={startFresh} className="text-muted-foreground transition-colors hover:text-primary">
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-sm text-muted-foreground">{L.description}</p>

        <div className="flex gap-2">
          <Button onClick={loadDemo} className="flex-1 bg-primary text-primary-foreground hover:bg-primary-deep">
            <Sparkles className="mr-2 h-4 w-4" /> {L.loadDemo}
          </Button>
          <Button variant="outline" onClick={startFresh}>{L.startFresh}</Button>
        </div>
      </div>
    </div>
  );
}
