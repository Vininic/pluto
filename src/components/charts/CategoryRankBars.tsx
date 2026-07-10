import { useMoneyFormat } from "@/lib/i18n/I18nProvider";

interface CategoryRankBarsProps {
  items: { name: string; valueCents: number; color: string }[];
}

/** Text readable against a given hex fill — same luminance formula the
 *  suite's XLSX exports already use (lib/reports/xlsx.ts), kept local since
 *  this is the only place in the UI that bakes text inside a colored fill. */
function readableText(hex: string): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.62 ? "#1a1a1a" : "#ffffff";
}

/** A ranked "leaderboard" of categories — cascading bar widths with the
 *  label and amount baked into the bar itself, sorted descending. Plain
 *  divs rather than recharts: no chart library bakes readable text inside a
 *  per-item colored fill cleanly. */
export default function CategoryRankBars({ items }: CategoryRankBarsProps) {
  const money = useMoneyFormat();
  const sorted = [...items].filter((i) => i.valueCents > 0).sort((a, b) => b.valueCents - a.valueCents);
  const max = sorted[0]?.valueCents ?? 0;

  if (sorted.length === 0) return null;

  return (
    <div className="space-y-2">
      {sorted.map((item) => {
        const pct = max > 0 ? Math.max(22, Math.round((item.valueCents / max) * 100)) : 22;
        return (
          <div
            key={item.name}
            className="flex items-center justify-between gap-3 rounded-lg py-2 pl-3 pr-3 text-sm font-medium transition-all"
            style={{ width: `${pct}%`, minWidth: "fit-content", background: item.color, color: readableText(item.color) }}
          >
            <span className="truncate">{item.name}</span>
            <span className="num shrink-0">{money.format(item.valueCents)}</span>
          </div>
        );
      })}
    </div>
  );
}
