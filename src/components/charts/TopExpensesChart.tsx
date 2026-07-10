import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { CategoryMonthTotal } from "@/lib/ledger/service";
import { useMoneyFormat } from "@/lib/i18n/I18nProvider";

interface TopExpensesChartProps {
  items: CategoryMonthTotal[];
  categoryName: (id: string | null) => string;
  categoryColor: (id: string | null) => string;
}

export default function TopExpensesChart({ items, categoryName, categoryColor }: TopExpensesChartProps) {
  const money = useMoneyFormat();
  const data = items.map((i) => ({ name: categoryName(i.categoryId), value: i.expenseCents, color: categoryColor(i.categoryId) }));

  return (
    <div style={{ height: Math.max(120, data.length * 34) }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="name" width={96} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
          <Tooltip
            cursor={{ fill: "hsl(var(--muted))" }}
            contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 500 }}
            formatter={(value: number) => [money.format(value), ""]}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={16}>
            {data.map((d, i) => <Cell key={i} fill={d.color} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
