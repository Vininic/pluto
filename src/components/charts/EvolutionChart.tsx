import { Area, Bar, CartesianGrid, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { EvolutionPoint } from "@/lib/ledger/service";
import { useI18n, useMoneyFormat } from "@/lib/i18n/I18nProvider";

interface EvolutionChartProps {
  points: EvolutionPoint[];
}

function monthLabel(yyyyMM: string, bcp47: string): string {
  const [y, m] = yyyyMM.split("-").map(Number);
  return new Intl.DateTimeFormat(bcp47, { month: "short", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, 1)));
}

/** Cumulative net as a filled area (the trend), month-by-month net as bars
 *  (the detail) — one chart carrying both reads without a legend to parse. */
export default function EvolutionChart({ points }: EvolutionChartProps) {
  const money = useMoneyFormat();
  const { bcp47 } = useI18n();
  const data = points.map((p) => ({ ...p, label: monthLabel(p.month, bcp47) }));

  return (
    <div className="h-28 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="pluto-cumulative" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--secondary))" stopOpacity={0.35} />
              <stop offset="100%" stopColor="hsl(var(--secondary))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
          <YAxis hide />
          <Tooltip
            contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 500 }}
            formatter={(value: number, key: string) => [money.format(value), key === "netCents" ? "Net" : "Cumulative"]}
          />
          <Bar dataKey="netCents" radius={[3, 3, 0, 0]} fill="hsl(var(--primary))" barSize={18} />
          <Area type="monotone" dataKey="cumulativeCents" stroke="hsl(var(--secondary))" strokeWidth={2} fill="url(#pluto-cumulative)" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
