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
        memberPaymentsByCompetence={{
          "u-1": {
            "2026-02": 20,
            "2026-03": 50,
          },
        }}
        closingDay={10}
      />
    </MemoryRouter>
  );
}

describe("Checklist funcional do AdminTab", () => {
  it("carrega dados iniciais e abre detalhes da competência", async () => {
    renderAdminTab();

    // Ensure button is there
    const detailsBtn = screen.getByText(/Ver detalhes/i);
    expect(detailsBtn).toBeInTheDocument();

    // Open modal
    fireEvent.click(detailsBtn);

    expect(await screen.findByText("Resumo da Competência")).toBeInTheDocument();
    expect(screen.getByText("Ana Silva")).toBeInTheDocument();
    expect(screen.getByText("Bruno Costa")).toBeInTheDocument();
  });

  it("mostra o saldo principal do morador", async () => {
    renderAdminTab();

    fireEvent.click(screen.getByText(/Ver detalhes/i));

    // Ana Silva: accumulated_balance = -200
    expect(await screen.findByText("-R$ 200.00")).toBeInTheDocument();
    // Bruno Costa: accumulated_balance = -40
    expect(screen.getByText("-R$ 40.00")).toBeInTheDocument();
  });

  it("discrimina competências anteriores no modal e mantém itens colapsados por padrão", async () => {
    renderAdminTab();
    
    fireEvent.click(screen.getByText(/Ver detalhes/i));
    fireEvent.click(await screen.findByText("Ana Silva"));

    expect(await screen.findByText(/Competência março\/2026/i)).toBeInTheDocument();
    expect(screen.getByText(/Competência fevereiro\/2026/i)).toBeInTheDocument();
    expect(screen.getAllByText("Total competência").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Total pago").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Total pendente").length).toBeGreaterThan(0);
    expect(screen.queryByText("Água")).not.toBeInTheDocument();
    expect(screen.queryByText("Luz")).not.toBeInTheDocument();
    expect(screen.queryByText("Competência abril/2026")).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByText("Itens da competência (1)")[0]);
    expect(await screen.findByText("Água")).toBeInTheDocument();
  });
});