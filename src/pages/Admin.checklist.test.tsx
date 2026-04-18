import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import Admin from "./Admin";

vi.mock("@/components/dashboard/DashboardHeader", () => ({
  DashboardHeader: () => <div>header</div>,
}));

vi.mock("@/components/dashboard/AdminTab", () => ({
  AdminTab: () => <div>admin-tab</div>,
}));

vi.mock("@/hooks/useCycleDates", () => ({
  useCycleDates: () => ({
    currentDate: new Date("2026-04-10T12:00:00.000Z"),
    cycleStart: new Date("2026-04-01T00:00:00.000Z"),
    cycleEnd: new Date("2026-05-01T00:00:00.000Z"),
    cycleLimitDate: new Date("2026-04-30T00:00:00.000Z"),
    nextMonth: vi.fn(),
    prevMonth: vi.fn(),
    closingDay: 10,
  }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    membership: { group_id: "g1", group_name: "Casa" },
    isAdmin: true,
    profile: { full_name: "Admin" },
  }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {},
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: vi.fn((options: { queryKey: unknown[] }) => {
    const key = String(options.queryKey?.[0]);
    if (key === "expenses-dashboard") {
      return { data: [], isLoading: false, isError: false, error: null };
    }

    return {
      data: null,
      isLoading: false,
      isError: true,
      error: new Error("erro_simulado_query_admin"),
    };
  }),
}));

describe("Checklist funcional do Admin - fallback", () => {
  it("exibe fallback apropriado quando query falha", () => {
    render(<Admin />);

    expect(screen.getByText(/Não foi possível carregar os dados administrativos/i)).toBeInTheDocument();
    expect(screen.getByText(/Código de referência:/i)).toBeInTheDocument();
    expect(screen.getByText(/ADMIN_LOAD_FAILED_RPC/i)).toBeInTheDocument();
    expect(screen.getByText(/Verificar RPC/i)).toBeInTheDocument();
    expect(screen.getByText(/Verificar grants/i)).toBeInTheDocument();
    expect(screen.getByText(/Verificar migration aplicada/i)).toBeInTheDocument();

    if (import.meta.env.DEV) {
      expect(screen.getByText(/erro_simulado_query_admin/i)).toBeInTheDocument();
    } else {
      expect(screen.queryByText(/erro_simulado_query_admin/i)).not.toBeInTheDocument();
    }
  });
});
