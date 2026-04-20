export const MISSING_COMPETENCE_LABEL = "Sem competência";

export type PendingSplitItem = {
  id: string;
  amount: number;
  originalAmount?: number;
  installment_number?: number;
  competenceKey?: string | null;
  expenses?: {
    title?: string | null;
    purchase_date?: string | null;
    installments: number;
    category: string;
  };
};

export type PendingByCompetenceGroup = {
  competenceKey: string | null;
  competenceLabel: string;
  total: number;
  items: PendingSplitItem[];
};

export const getPendingCompetenceLabel = (competenceKey?: string | null) =>
  competenceKey
    ? `${competenceKey.slice(5, 7)}/${competenceKey.slice(0, 4)}`
    : MISSING_COMPETENCE_LABEL;

export const resolvePendingCompetenceKey = ({
  competenceKey,
  purchaseDate,
  closingDay,
  getCompetenceKeyFromDate,
}: {
  competenceKey?: string | null;
  purchaseDate?: string | null;
  closingDay: number;
  getCompetenceKeyFromDate: (date: Date, closingDay: number) => string;
}) => {
  if (competenceKey) return competenceKey;
  if (!purchaseDate) return null;
  return getCompetenceKeyFromDate(new Date(`${purchaseDate}T12:00:00`), closingDay);
};

export const sortPendingItemsByDateDesc = (a: PendingSplitItem, b: PendingSplitItem) =>
  (b.expenses?.purchase_date || "").localeCompare(a.expenses?.purchase_date || "");

export const sortByCompetenceLabelDesc = (a: PendingByCompetenceGroup, b: PendingByCompetenceGroup) => {
  if (a.competenceKey === null) return 1;
  if (b.competenceKey === null) return -1;
  return b.competenceKey.localeCompare(a.competenceKey);
};

export const groupPendingByCompetence = (items: PendingSplitItem[]): PendingByCompetenceGroup[] => {
  const grouped = items.reduce((acc, item) => {
    const competenceKey = item.competenceKey || null;
    if (!acc[competenceKey ?? "__missing__"]) {
      acc[competenceKey ?? "__missing__"] = {
        competenceKey,
        competenceLabel: getPendingCompetenceLabel(competenceKey),
        total: 0,
        items: [],
      };
    }

    acc[competenceKey ?? "__missing__"].items.push(item);
    acc[competenceKey ?? "__missing__"].total += Number(item.amount);
    return acc;
  }, {} as Record<string, PendingByCompetenceGroup>);

  return Object.values(grouped)
    .map((group) => ({
      ...group,
      items: [...group.items].sort(sortPendingItemsByDateDesc),
    }))
    .sort(sortByCompetenceLabelDesc);
};