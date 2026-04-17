import { describe, expect, it } from "vitest";

type Row = {
  id: string;
  amount: number;
  competence_key?: string | null;
  competence_year?: number | null;
  competence_month?: number | null;
};

const keyOf = (year: number, month: number) => `${year}-${String(month).padStart(2, "0")}`;

const sumByKey = (rows: Row[], year: number, month: number) =>
  rows
    .filter((row) => row.competence_key === keyOf(year, month))
    .reduce((sum, row) => sum + row.amount, 0);

const sumByColumnsWithFallback = (rows: Row[], year: number, month: number) =>
  rows
    .filter((row) => {
      if (row.competence_year != null && row.competence_month != null) {
        return row.competence_year === year && row.competence_month === month;
      }
      return row.competence_key === keyOf(year, month);
    })
    .reduce((sum, row) => sum + row.amount, 0);

describe("paridade de totais por competência (despesas/pagamentos/dashboard/admin)", () => {
  const beforeExpenses: Row[] = [
    { id: "e1", amount: 1200, competence_key: "2025-12" },
    { id: "e2", amount: 900, competence_key: "2026-01" },
    { id: "e3", amount: 250, competence_key: "2026-01" },
  ];

  const beforePayments: Row[] = [
    { id: "p1", amount: 400, competence_key: "2025-12" },
    { id: "p2", amount: 500, competence_key: "2026-01" },
    { id: "p3", amount: 150, competence_key: "2026-01" },
  ];

  // Mesmo conjunto de eventos após migração (agora com ano/mês persistidos).
  const afterExpenses: Row[] = beforeExpenses.map((row) => {
    const [year, month] = String(row.competence_key).split("-").map(Number);
    return { ...row, competence_year: year, competence_month: month };
  });

  // Mantém combinação mista para cobrir compatibilidade durante rollout.
  const afterPayments: Row[] = beforePayments.map((row, idx) => {
    const [year, month] = String(row.competence_key).split("-").map(Number);
    return idx % 2 === 0
      ? { ...row, competence_year: year, competence_month: month }
      : { ...row, competence_year: year, competence_month: month, competence_key: null };
  });

  const sampleCompetences: Array<[number, number]> = [
    [2025, 12], // inclui virada de ano
    [2026, 1],
  ];

  it("preserva totais da tela de despesas nas competências de amostra", () => {
    for (const [year, month] of sampleCompetences) {
      const totalBefore = sumByKey(beforeExpenses, year, month);
      const totalAfter = sumByColumnsWithFallback(afterExpenses, year, month);
      expect(totalAfter).toBe(totalBefore);
    }
  });

  it("preserva totais da tela de pagamentos nas competências de amostra", () => {
    for (const [year, month] of sampleCompetences) {
      const totalBefore = sumByKey(beforePayments, year, month);
      const totalAfter = sumByColumnsWithFallback(afterPayments, year, month);
      expect(totalAfter).toBe(totalBefore);
    }
  });

  it("preserva totais consolidados usados por dashboard/admin por competência", () => {
    const beforeCombined = [...beforeExpenses, ...beforePayments];
    const afterCombined = [...afterExpenses, ...afterPayments];

    for (const [year, month] of sampleCompetences) {
      const totalBefore = sumByKey(beforeCombined, year, month);
      const totalAfter = sumByColumnsWithFallback(afterCombined, year, month);
      expect(totalAfter).toBe(totalBefore);
    }
  });
});
