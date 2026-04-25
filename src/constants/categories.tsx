import { Home, Lightbulb, Wifi, Sparkles, Wrench, ShoppingCart, HelpCircle, Car, Utensils, HeartPulse, Film, GraduationCap } from 'lucide-react';
import React from 'react';

export const CATEGORY_LABELS: Record<string, string> = {
  rent: "Aluguel",
  utilities: "Contas (Luz/Água)",
  internet: "Internet/TV",
  cleaning: "Limpeza",
  maintenance: "Manutenção",
  groceries: "Mercado",
  other: "Outros",
  // Fallbacks for potential custom or legacy data
  transport: "Transporte",
  food: "Alimentação",
  health: "Saúde",
  leisure: "Lazer",
  education: "Educação",
};

export const getCategoryIcon = (key: string | undefined | null, props?: any) => {
  if (!key) return <HelpCircle {...props} />;
  const categoryIcons: Record<string, React.ReactNode> = {
    rent: <Home {...props} />,
    utilities: <Lightbulb {...props} />,
    internet: <Wifi {...props} />,
    cleaning: <Sparkles {...props} />,
    maintenance: <Wrench {...props} />,
    groceries: <ShoppingCart {...props} />,
    transport: <Car {...props} />,
    food: <Utensils {...props} />,
    health: <HeartPulse {...props} />,
    leisure: <Film {...props} />,
    education: <GraduationCap {...props} />,
    other: <HelpCircle {...props} />,
  };
  return categoryIcons[key] || <HelpCircle {...props} />;
};

export const CHART_COLORS = [
  "#0f172a", // slate-900
  "#334155", // slate-700
  "#64748b", // slate-500
  "#94a3b8", // slate-400
  "#cbd5e1", // slate-300
];

// Colors for categories specifically (optional, to keep consistency)
export const CATEGORY_COLORS: Record<string, string> = {
  "Aluguel": "#0f172a",
  "Mercado": "#16a34a", // green
  "Contas (Luz/Água)": "#ea580c", // orange
  "Internet/TV": "#2563eb", // blue
  "Limpeza": "#0891b2", // cyan
  "Outros": "#64748b", // slate
  "Transporte": "#f59e0b", // amber
  "Alimentação": "#e11d48", // rose
  "Saúde": "#14b8a6", // teal
  "Lazer": "#8b5cf6", // violet
  "Educação": "#d946ef", // fuchsia
  "Manutenção": "#84cc16", // lime
};

export const getCategoryLabel = (key: string | undefined | null) => {
  if (!key) return "Outros";
  return CATEGORY_LABELS[key] || key.charAt(0).toUpperCase() + key.slice(1);
};