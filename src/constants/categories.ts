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

// Paleta profissional e sóbria (focada em azuis, teals, índigos e cinzas-azulados)
export const CHART_COLORS = [
  "#2563eb", // blue-600
  "#0f766e", // teal-700
  "#6366f1", // indigo-500
  "#0369a1", // cyan-700
  "#4338ca", // indigo-700
  "#1d4ed8", // blue-700
  "#047857", // emerald-700
  "#64748b", // slate-500
  "#be185d", // rose-700 (contraste sutil)
  "#b45309", // amber-700 (contraste sutil)
];

// Cores fixas para categorias conhecidas (tons mais fechados e corporativos)
export const CATEGORY_COLORS: Record<string, string> = {
  "Aluguel": "#2563eb", // blue-600
  "Mercado": "#047857", // emerald-700
  "Contas (Luz/Água)": "#0f766e", // teal-700
  "Internet/TV": "#0369a1", // cyan-700
  "Limpeza": "#6366f1", // indigo-500
  "Manutenção": "#475569", // slate-600
  "Transporte": "#4338ca", // indigo-700
  "Alimentação": "#1d4ed8", // blue-700
  "Saúde": "#be185d", // rose-700
  "Lazer": "#b45309", // amber-700
  "Educação": "#1e3a8a", // blue-900
  "Outros": "#94a3b8", // slate-400
};

export const getCategoryLabel = (key: string | undefined | null) => {
  if (!key) return "Outros";
  return CATEGORY_LABELS[key] || key.charAt(0).toUpperCase() + key.slice(1);
};