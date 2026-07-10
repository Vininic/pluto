import { useState } from "react";
import { Moon, Sparkles, Sun } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DEFAULT_MODELS, PROVIDER_LABELS, loadAiSettings, saveAiSettings,
  type AiAutonomy, type AiProvider, type AiSettings,
} from "@/lib/ai/settings";
import { useT } from "@/lib/i18n/I18nProvider";
import { useTheme } from "@/lib/theme/ThemeProvider";
import { cn } from "@/lib/utils";

function Section({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <section className="pluto-card p-6">
      <div className="text-[11px] uppercase tracking-[0.22em] text-secondary">{eyebrow}</div>
      <h2 className="font-display mt-1 text-2xl text-primary">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

/** Appearance + Aetheris provider. Data export/import (needs the report/
 *  outbox pieces) joins this page in M5 — see PLUTO.md milestones. */
export default function Settings() {
  const { theme, setTheme } = useTheme();
  const t = useT();
  const L = t.pluto.settings;
  const [ai, setAi] = useState<AiSettings>(loadAiSettings);

  function patchAi(patch: Partial<AiSettings>) {
    setAi((s) => {
      const next = { ...s, ...patch };
      saveAiSettings(next);
      return next;
    });
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <header>
        <div className="text-[11px] uppercase tracking-[0.22em] text-secondary">{L.eyebrow}</div>
        <h1 className="font-display mt-1.5 text-4xl text-primary">{L.title}</h1>
      </header>

      <Section eyebrow={L.appearanceEyebrow} title={L.appearanceTitle}>
        <div className="flex gap-2">
          {([
            { value: "light", label: L.parchment, icon: Sun },
            { value: "dark", label: L.vault, icon: Moon },
          ] as const).map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setTheme(value)}
              aria-pressed={theme === value}
              className={cn(
                "flex h-11 flex-1 items-center justify-center gap-2 rounded-lg border text-sm font-medium transition-colors",
                theme === value ? "border-secondary/60 bg-secondary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>
      </Section>

      <Section eyebrow={L.aetherisEyebrow} title={L.aetherisTitle}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{L.provider}</Label>
            <Select value={ai.provider} onValueChange={(v) => patchAi({ provider: v as AiProvider, model: "" })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(PROVIDER_LABELS) as AiProvider[]).map((p) => (
                  <SelectItem key={p} value={p}>{PROVIDER_LABELS[p]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ai-model" className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{L.model}</Label>
            <Input id="ai-model" value={ai.model} onChange={(e) => patchAi({ model: e.target.value })} placeholder={DEFAULT_MODELS[ai.provider]} disabled={ai.provider === "gemini-hosted" || ai.provider === "openrouter-hosted"} />
          </div>
          {ai.provider === "gemini-hosted" || ai.provider === "openrouter-hosted" ? (
            <div className="flex items-center gap-2 rounded-md border border-secondary/30 bg-secondary/10 p-3 text-xs text-muted-foreground sm:col-span-2">
              <Sparkles className="h-3.5 w-3.5 shrink-0 text-secondary" />
              {L.hostedNote}
            </div>
          ) : ai.provider !== "ollama" ? (
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="ai-key" className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{L.apiKey}</Label>
              <Input id="ai-key" type="password" value={ai.apiKey} onChange={(e) => patchAi({ apiKey: e.target.value })} placeholder={L.apiKeyPlaceholder} />
            </div>
          ) : (
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="ai-url" className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{L.ollamaUrl}</Label>
              <Input id="ai-url" value={ai.baseUrl} onChange={(e) => patchAi({ baseUrl: e.target.value })} placeholder="http://localhost:11434" />
            </div>
          )}
          <div className="space-y-2 sm:col-span-2">
            <Label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{L.autonomy}</Label>
            <Select value={ai.autonomy} onValueChange={(v) => patchAi({ autonomy: v as AiAutonomy })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="suggest">{L.autonomySuggest}</SelectItem>
                <SelectItem value="auto">{L.autonomyAuto}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Sparkles className="h-3 w-3 text-secondary" />
          {L.keysNote}
        </p>
      </Section>
    </div>
  );
}
