import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AdminTab } from "@/components/dashboard/AdminTab";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { useCycleDates } from "@/hooks/useCycleDates";
import { formatCompetenceKey } from "@/lib/cycleDates";
import type { AdminDashboardData } from "@/types/admin";

export default function Admin() {
  const { membership, isAdmin, profile } = useAuth();
  const [heroCompact, setHeroCompact] = useState(false);
  const isDevEnvironment = import.meta.env.DEV;
  
  const { currentDate, cycleStart, cycleEnd, cycleLimitDate, nextMonth, prevMonth, closingDay } = useCycleDates(membership?.group_id);

  const modoGestao = membership?.group_modo_gestao || 'centralized';
  const currentCompetenceKey = formatCompetenceKey(currentDate);

  const { data: expensesInCycle = [] } = useQuery({
    queryKey: ["admin-expenses", membership?.group_id, currentCompetenceKey],
    queryFn: async () => {
      if (!membership?.group_id) return [];
      const { data, error } = await supabase
        .from("expenses")
        .select(`id, amount, expense_type, title, category, purchase_date, expense_splits ( user_id, amount )`)
        .eq("group_id", membership!.group_id)
        .eq("competence_key", currentCompetenceKey);
      
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!membership?.group_id
  });

  const collectiveExpenses = expensesInCycle.filter(e => e.expense_type === "collective");
  const totalMonthExpenses = collectiveExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

  const { data: adminData, isLoading, error, refetch } = useQuery<AdminDashboardData | null>({
    queryKey: ["admin-dashboard-data", membership?.group_id, currentCompetenceKey, modoGestao],
    queryFn: async () => {
      if (!isAdmin || !membership?.group_id || modoGestao !== 'centralized') {
        // Temporariamente, só lidamos com o modo centralizado. O P2P será reconstruído depois.
        return null;
      }

      // Lógica para o modo CENTRALIZADO
      const { data, error } = await supabase.rpc("get_admin_dashboard_data", { 
        _group_id: membership.group_id,
        _competence_key: currentCompetenceKey
      });

      if (error) throw error;
      if (!data) return null;

      // O RPC agora retorna um objeto JSON, então precisamos apenas fazer o parse
      // e garantir que os tipos estejam corretos.
      const result = data as unknown as AdminDashboardData;

      return {
        ...result,
        // Garantir que campos que podem ser nulos no JSON tenham um valor padrão
        members: result.members || [],
        p2pMatrix: [], // Não aplicável no modo centralizado
        cycleSplits: result.cycleSplits || [],
        pendingSplits: result.pendingSplits || [],
        memberPaymentsByCompetence: result.memberPaymentsByCompetence || {},
        nonCriticalWarnings: result.nonCriticalWarnings || [],
      };
    },
    enabled: !!membership?.group_id && isAdmin
  });

  if (!membership) {
    return <div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  }
  if (!isAdmin) {
    return <div className="p-8 text-center text-foreground">Acesso restrito a administradores.</div>;
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <DashboardHeader userName={profile?.full_name} groupName={membership?.group_name} currentDate={currentDate} cycleStart={cycleStart} cycleEnd={cycleEnd} cycleLimitDate={cycleLimitDate} onNextMonth={nextMonth} onPrevMonth={prevMonth} onCompactChange={setHeroCompact} />
      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">Carregando dados administrativos...</div>
      ) : error ? (
        <div className="space-y-3 rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-center">
          <p className="font-medium text-destructive">Não foi possível carregar os dados administrativos.</p>
          <p className="text-sm text-muted-foreground">Tente novamente em alguns instantes.</p>
          {isDevEnvironment && <pre className="overflow-x-auto rounded-md border border-dashed border-destructive/30 bg-background p-3 text-left text-xs text-muted-foreground">{`Detalhes técnicos (dev): ${error.message}`}</pre>}
          <button type="button" onClick={() => refetch()} className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90">Tentar novamente</button>
        </div>
      ) : adminData ? (
        <div className="space-y-3">
          <AdminTab
            modoGestao={modoGestao}
            groupId={membership.group_id}
            members={adminData.members}
            p2pMatrix={adminData.p2pMatrix}
            collectiveExpenses={collectiveExpenses}
            totalMonthExpenses={totalMonthExpenses}
            cycleStart={cycleStart}
            cycleEnd={cycleEnd}
            currentDate={currentDate}
            closingDay={closingDay ?? 1}
            pendingPaymentsCount={adminData.pendingPaymentsCount}
            exMembersDebt={adminData.exMembersDebt}
            departuresCount={adminData.departuresCount}
            redistributedCount={adminData.redistributedCount}
            lowStockCount={adminData.lowStockCount}
            cycleSplits={adminData.cycleSplits}
            pendingSplits={adminData.pendingSplits}
            memberPaymentsByCompetence={adminData.memberPaymentsByCompetence}
            nonCriticalWarnings={adminData.nonCriticalWarnings}
          />
        </div>
      ) : (
        <div className="space-y-3 rounded-lg border p-6 text-center">
          <p className="font-medium text-foreground">Dados administrativos indisponíveis.</p>
          <p className="text-sm text-muted-foreground">Nenhum dado foi retornado para o modo de gestão '{modoGestao}'. A lógica para este modo será reconstruída.</p>
          <button type="button" onClick={() => refetch()} className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90">Atualizar dados</button>
        </div>
      )}
    </div>
  );
}
