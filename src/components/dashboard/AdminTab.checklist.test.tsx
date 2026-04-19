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
          {
            user_id: "u-3",
            profile: { full_name: "Carla Lima", avatar_url: null },
            role: "morador",
            previous_debt: 90,
            balance: -90,
            accumulated_balance: -90,
            total_owed: 0,
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
            status: "paid",
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
            status: "pending",
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
            status: "pending",
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
    expect(screen.getByText("Carla Lima")).toBeInTheDocument();
  });

  it("mostra resumo da competência com total, pago, pendente e pendências anteriores", () => {
    renderAdminTab();

    expect(screen.getByText("Total competência: R$ 80.00")).toBeInTheDocument();
    expect(screen.getAllByText("Total pago: R$ 0.00").length).toBeGreaterThan(0);
    expect(screen.getByText("Total pendente: R$ 80.00")).toBeInTheDocument();
    expect(screen.getByText("Pendências anteriores: R$ 120.00")).toBeInTheDocument();
  });

  it("discrimina competências anteriores no modal e mantém itens colapsados por padrão", async () => {
    renderAdminTab();
    fireEvent.click(screen.getByText("Ana Silva"));

    expect(await screen.findByText(/Competência fevereiro\/2026/i)).toBeInTheDocument();
    expect(screen.getAllByText("Total competência").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Total pago").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Total pendente").length).toBeGreaterThan(0);
    expect(screen.queryByText("Água")).not.toBeInTheDocument();
    expect(screen.queryByText("Luz")).not.toBeInTheDocument();
    expect(screen.queryByText("Competência abril/2026")).not.toBeInTheDocument();
    expect(screen.getAllByText("R$ 120.00").length).toBeGreaterThan(0);
    expect(screen.getAllByText("R$ 200.00").length).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByText("Itens da competência (1)")[0]);
    expect(await screen.findByText("Luz")).toBeInTheDocument();
  });

  it("mantém valores corretos para usuário sem pendência anterior", () => {
    renderAdminTab();

    expect(screen.getByText("Total competência: R$ 40.00")).toBeInTheDocument();
    expect(screen.getByText("Total pendente: R$ 40.00")).toBeInTheDocument();
    expect(screen.getByText("Pendências anteriores: R$ 0.00")).toBeInTheDocument();
  });

  it("usa saldo da competência atual para status do morador", () => {
    renderAdminTab();
    const carlaRow = screen.getByText("Carla Lima").closest("div.flex.items-center.justify-between");

    expect(carlaRow).not.toBeNull();
    expect(screen.getByText("Pendências anteriores: R$ 90.00")).toBeInTheDocument();
    expect(screen.getByText("Neutro")).toBeInTheDocument();
  });
});
