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
            id: "u-1",
            full_name: "Ana Silva",
            avatar_url: null,
          },
          {
            id: "u-2",
            full_name: "Bruno Costa",
            avatar_url: null,
          },
        ]}
        modoGestao="p2p"
        p2pMatrix={[]}
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
        closingDay={10}
        groupId="group-1"
        pendingPaymentsCount={0}
        exMembersDebt={0}
        departuresCount={0}
        redistributedCount={0}
        lowStockCount={0}
        cycleSplits={[]}
        pendingSplits={[]}
        memberPaymentsByCompetence={{}}
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