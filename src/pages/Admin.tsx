import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AdminTab } from "@/components/dashboard/AdminTab";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { useCycleDates } from "@/hooks/useCycleDates";
import { formatCompetenceKey } from "@/lib/cycleDates";

export default function Admin() {
  const { membership, isAdmin, profile } = useAuth();
  const [heroCompact, setHeroCompact] = useState(false);
  const isDevEnvironment = import.meta.env.DEV;
  
  const {
    currentDate,
    cycleStart,
    cycleEnd,
    cycleLimitDate,
    nextMonth,
    prevMonth,
    closingDay,
  } = useCycleDates(membership?.group_id);

  const currentCompetenceKey = formatCompetenceKey(currentDate);
  const adminDashboardQueryKey = ["admin-dashboard-data", membership?.group_id, currentCompetenceKey] as const;

  const { data: expensesInCycle = [] } = useQuery({
    queryKey: ["expenses-dashboard", membership?.group_id, currentCompetenceKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select(`
          id, amount, expense_type, title, category, purchase_date,
          expense_splits ( user_id, amount )
        `)
        .eq("group_id", membership!.group_id)
        .eq("competence_key", currentCompetenceKey);
      
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!membership?.group_id
  });

  const collectiveExpenses = expensesInCycle.filter(e => e.expense_type === "collective");
  const totalMonthExpenses = collectiveExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

  const {
    data: adminData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: adminDashboardQueryKey,
    queryFn: async () => {
      if (!isAdmin || !membership?.group_id) return null;

      const [membersRes, p2pMatrixRes] = await Promise.all([
        supabase.from("group_member_profiles").select("id, full_name, avatar_url").eq("group_id", membership.group_id),
        supabase.rpc("get_group_p2p_matrix" as any, { _group_id: membership.group_id }),
      ]);

      if (membersRes.error) throw membersRes.error;
      if (p2pMatrixRes.error) throw p2pMatrixRes.error;

      const members = membersRes.data || [];
      const p2pMatrix = p2pMatrixRes.data || [];

      return {
        members,
        p2pMatrix,
        // These are placeholders, as the old logic is deprecated
        pendingPaymentsCount: 0,
        exMembersDebt: 0,
        departuresCount: 0,
        redistributedCount: 0,
        lowStockCount: 0,
        cycleSplits: [],
        pendingSplits: [],
        memberPaymentsByCompetence: {},
        nonCriticalWarnings: [],
      };
    },
    enabled: !!membership?.group_id && isAdmin
  });

  if (!membership) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAdmin) {
    return <div className="p-8 text-center text-foreground">Acesso restrito a administradores.</div>;
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <DashboardHeader
        userName={profile?.full_name}
        groupName={membership?.group_name}
        currentDate={currentDate}
        cycleStart={cycleStart}
        cycleEnd={cycleEnd}
        cycleLimitDate={cycleLimitDate}
        onNextMonth={nextMonth}
        onPrevMonth={prevMonth}
        onCompactChange={setHeroCompact}
      />

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">Carregando dados administrativos...</div>
      ) : error ? (
        <div className="space-y-3 rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-center">
          <p className="font-medium text-destructive">Não foi possível carregar os dados administrativos.</p>
          <p className="text-sm text-muted-foreground">
            Tente novamente em alguns instantes.
          </p>
          {isDevEnvironment ? (
            <pre className="overflow-x-auto rounded-md border border-dashed border-destructive/30 bg-background p-3 text-left text-xs text-muted-foreground">
              {`Detalhes técnicos (dev): ${error.message}`}
            </pre>
          ) : null}
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Tentar novamente
          </button>
        </div>
      ) : adminData ? (
        <div className="space-y-3">
          <AdminTab
            modoGestao={(membership as any)?.group_modo_gestao}
            members={adminData.members}
            p2pMatrix={adminData.p2pMatrix}
            collectiveExpenses={collectiveExpenses}
            totalMonthExpenses={totalMonthExpenses}
            cycleStart={cycleStart}
            cycleEnd={cycleEnd}
            currentDate={currentDate}
            closingDay={closingDay ?? 1}
          />
        </div>
      ) : (
        <div className="space-y-3 rounded-lg border p-6 text-center">
          <p className="font-medium text-foreground">Dados administrativos indisponíveis para este ciclo.</p>
          <p className="text-sm text-muted-foreground">Nenhum dado foi retornado no momento. Atualize para tentar novamente.</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Atualizar dados
          </button>
        </div>
      )}
    </div>
  );
}
