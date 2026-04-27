import { useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { CHART_COLORS, CATEGORY_COLORS } from "@/constants/categories";
import { cn } from "@/lib/utils";

export function RepublicChart({ data, total }: { data: { name: string; value: number }[]; total: number }) {
  const [hoveredSegmentLabel, setHoveredSegmentLabel] = useState<string | null>(null);

  if (!data || data.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">Sem dados para exibir.</p>;
  }

  const chartData = data.map((entry, index) => ({
    ...entry,
    color: CATEGORY_COLORS[entry.name] || CHART_COLORS[index % CHART_COLORS.length],
  }));

  const activeSegment = chartData.find(d => d.name === hoveredSegmentLabel);
  const displayValue = activeSegment ? activeSegment.value : total;
  const displayLabel = activeSegment ? activeSegment.name : "Total da Casa";
  const displayPercentage = activeSegment && total > 0 ? (activeSegment.value / total) * 100 : 100;

  return (
    <div className="h-48 w-full relative">
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
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            stroke="none"
            cornerRadius={5}
            onMouseEnter={(_, index) => setHoveredSegmentLabel(chartData[index].name)}
            onMouseLeave={() => setHoveredSegmentLabel(null)}
          >
            {chartData.map((entry) => (
              <Cell 
                key={`cell-${entry.name}`} 
                fill={entry.color} 
                opacity={hoveredSegmentLabel === null || hoveredSegmentLabel === entry.name ? 1 : 0.3}
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