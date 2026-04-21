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

// Paleta colorida e vibrante para categorias dinâmicas (fallback)
export const CHART_COLORS = [
  "#0ea5e9", // sky-500 (Azul claro)
  "#8b5cf6", // violet-500 (Roxo)
  "#f59e0b", // amber-500 (Amarelo/Laranja)
  "#10b981", // emerald-500 (Verde)
  "#f43f5e", // rose-500 (Rosa/Vermelho)
  "#6366f1", // indigo-500 (Anil)
  "#14b8a6", // teal-500 (Verde-azulado)
  "#f97316", // orange-500 (Laranja)
  "#84cc16", // lime-500 (Verde limão)
  "#d946ef", // pink-500 (Rosa choque)
];

// Cores fixas para categorias conhecidas para manter a consistência em diferentes telas
export const CATEGORY_COLORS: Record<string, string> = {
  "Aluguel": "#6366f1", // indigo
  "Mercado": "#10b981", // emerald (comida/fresco)
  "Contas (Luz/Água)": "#f59e0b", // amber (energia/atenção)
  "Internet/TV": "#0ea5e9", // sky (conectividade)
  "Limpeza": "#06b6d4", // cyan (água/limpo)
  "Manutenção": "#8b5cf6", // violet
  "Transporte": "#f43f5e", // rose
  "Alimentação": "#f97316", // orange
  "Saúde": "#ec4899", // pink
  "Lazer": "#84cc16", // lime
  "Educação": "#3b82f6", // blue
  "Outros": "#94a3b8", // slate-400 (neutro)
};

export const getCategoryLabel = (key: string | undefined | null) => {
  if (!key) return "Outros";
  return CATEGORY_LABELS[key] || key.charAt(0).toUpperCase() + key.slice(1);
};