import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { CHART_COLORS, CATEGORY_COLORS } from "@/constants/categories";

export function PersonalExpensesChart({ data }: { data: { name: string; value: number }[] }) {
  if (!data || data.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">Sem dados para exibir.</p>;
  }

  const chartData = data.map((entry, index) => ({
    ...entry,
    color: CATEGORY_COLORS[entry.name] || CHART_COLORS[index % CHART_COLORS.length],
  }));

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip
            formatter={(value: number) => `R$ ${value.toFixed(2)}`}
            contentStyle={{
              borderRadius: "0.5rem",
              borderColor: "hsl(var(--border))",
              backgroundColor: "hsl(var(--background))",
            }}
          />
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={80}
            innerRadius={50}
            paddingAngle={5}
            stroke="none"
            cornerRadius={5}
          >
            {chartData.map((entry) => (
              <Cell key={`cell-${entry.name}`} fill={entry.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}