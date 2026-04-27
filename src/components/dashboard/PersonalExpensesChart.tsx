import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { CHART_COLORS, CATEGORY_COLORS } from "@/constants/categories";

interface PersonalExpensesChartProps {
  data: { name: string; value: number }[];
  total: number;
  onHover: (label: string | null) => void;
  hoveredLabel: string | null;
}

export function PersonalExpensesChart({ data, total, onHover, hoveredLabel }: PersonalExpensesChartProps) {
  if (!data || data.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">Sem dados para exibir.</p>;
  }

  const chartData = data.map((entry, index) => ({
    ...entry,
    color: CATEGORY_COLORS[entry.name] || CHART_COLORS[index % CHART_COLORS.length],
  }));

  const activeSegment = chartData.find(d => d.name === hoveredLabel);
  const displayValue = activeSegment ? activeSegment.value : total;
  const displayLabel = activeSegment ? activeSegment.name : "Total Pessoal";
  const displayPercentage = activeSegment && total > 0 ? (activeSegment.value / total) * 100 : 100;

  return (
    <div className="relative h-[200px] w-[200px] shrink-0">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={70}
            outerRadius={90}
            paddingAngle={5}
            stroke="none"
            cornerRadius={5}
            onMouseEnter={(_, index) => onHover(chartData[index].name)}
            onMouseLeave={() => onHover(null)}
          >
            {chartData.map((entry) => (
              <Cell 
                key={`cell-${entry.name}`} 
                fill={entry.color} 
                opacity={hoveredLabel === null || hoveredLabel === entry.name ? 1 : 0.3}
                className="transition-opacity duration-200"
                style={{ outline: "none" }}
              />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none flex flex-col items-center justify-center w-full px-4">
        <p className="text-muted-foreground text-[10px] font-medium truncate max-w-[120px] uppercase tracking-wider leading-tight">
          {displayLabel}
        </p>
        <p className="text-lg font-bold text-foreground tabular-nums whitespace-nowrap">
          R$ {displayValue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
        {activeSegment && (
          <p className="text-xs font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full mt-1">
            {displayPercentage.toFixed(1)}%
          </p>
        )}
      </div>
    </div>
  );
}