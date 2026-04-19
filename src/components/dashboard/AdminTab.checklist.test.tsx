import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AdminTab } from "./AdminTab";

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PieChart: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Pie: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Cell: () => null,
  Tooltip: () => null,
  Legend: () => null,
}));

const baseDate = new Date("2026-04-10T12:00:00.000Z");

function renderAdminTab() {
  return render(
    <MemoryRouter>
      <AdminTab
        members={[
          {
            user_id: "u-1",
            profile: { full_name: "Ana Silva", avatar_url: null },
            role: "morador",
            previous_debt: 120,
            balance: -80,
            accumulated_balance: -200,
            total_owed: 80,
            total_paid: 0,
          },
          {
            user_id: "u-2",
            profile: { full_name: "Bruno Costa", avatar_url: null },
            role: "admin",
            previous_debt: 0,
            balance: -40,
            accumulated_balance: -40,
            total_owed: 40,
            total_paid: 0,
          },
        ]}
        pendingPaymentsCount={1}
        collectiveExpenses={[
          {
            id: "exp-1",
            title: "Mercado",
            amount: 120,
            category: "food",
            purchase_date: "2026-04-03",
          },
        ]}
        totalMonthExpenses={120}
        cycleStart={new Date("2026-04-01T00:00:00.000Z")}
        cycleEnd={new Date("2026-05-01T00:00:00.000Z")}
        currentDate={baseDate}
        exMembersDebt={0}
        departuresCount={0}
        redistributedCount={0}
        lowStockCount={0}
        cycleSplits={[
          {
            id: "split-current-ana",
            user_id: "u-1",
            amount: 80,
            expenses: {
              id: "exp-1",
              title: "Mercado",
              amount: 120,
              category: "food",
              purchase_date: "2026-04-03",
              competence_key: "2026-04",
            },
          },
          {
            id: "split-current-bruno",
            user_id: "u-2",
            amount: 40,
            expenses: {
              id: "exp-1",
              title: "Mercado",
              amount: 120,
              category: "food",
              purchase_date: "2026-04-03",
              competence_key: "2026-04",
            },
          },
        ]}
        pendingSplits={[
          {
            id: "split-prev-1",
            user_id: "u-1",
            amount: 50,
            expenses: {
              title: "Água",
              purchase_date: "2026-03-15",
              competence_key: "2026-03",
            },
          },
          {
            id: "split-prev-2",
            user_id: "u-1",
            amount: 70,
            expenses: {
              title: "Luz",
              purchase_date: "2026-02-15",
              competence_key: "2026-02",
            },
          },
          {
            id: "split-current-pending",
            user_id: "u-1",
            amount: 80,
            expenses: {
              title: "Mercado",
              purchase_date: "2026-04-03",
              competence_key: "2026-04",
            },
          },
        ]}
        closingDay={10}
      />
    </MemoryRouter>
  );
}

describe("Checklist funcional do AdminTab", () => {
  it("carrega dados iniciais sem tela em branco", () => {
    renderAdminTab();

    expect(screen.getByText("Resumo da Competência")).toBeInTheDocument();
    expect(screen.getByText("Ana Silva")).toBeInTheDocument();
    expect(screen.getByText("Bruno Costa")).toBeInTheDocument();
  });

  it("mostra débito anterior, competência atual e total acumulado para morador com pendência anterior", () => {
    renderAdminTab();

    expect(screen.getByText("Débito anterior: R$ 120.00")).toBeInTheDocument();
    expect(screen.getByText("Competência atual: -R$ 80.00")).toBeInTheDocument();
    expect(screen.getByText("Total acumulado: R$ 200.00")).toBeInTheDocument();
  });

  it("discrimina competências anteriores no modal do morador", async () => {
    renderAdminTab();
    fireEvent.click(screen.getByText("Ana Silva"));

    expect(await screen.findByText(/Competência março\/2026/i)).toBeInTheDocument();
    expect(screen.getByText(/Competência fevereiro\/2026/i)).toBeInTheDocument();
    expect(screen.getByText("Água")).toBeInTheDocument();
    expect(screen.getByText("Luz")).toBeInTheDocument();
    expect(screen.queryByText("Competência abril/2026")).not.toBeInTheDocument();
  });

  it("mantém valores corretos para usuário sem pendência anterior", () => {
    renderAdminTab();

    expect(screen.getByText("Débito anterior: R$ 0.00")).toBeInTheDocument();
    expect(screen.getByText("Competência atual: -R$ 40.00")).toBeInTheDocument();
    expect(screen.getByText("Total acumulado: R$ 40.00")).toBeInTheDocument();
  });
});
