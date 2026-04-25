import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AdminTab } from "@/components/dashboard/AdminTab";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { useCycleDates } from "@/hooks/useCycleDates";
import { formatCompetenceKey } from "@/lib/cycleDates";
import type { AdminDashboardData } from "@/types/admin";
import type { RpcReturns } from "@/integrations/supabase/rpc-types";

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

  const modoGestao = (membership as any)?.group_modo_gestao || 'centralized';
  const currentCompetenceKey = formatCompetenceKey(currentDate);
  const adminDashboardQueryKey = ["admin-dashboard-data", membership?.group_id, currentCompetenceKey, modoGestao] as const;

  const { data: expensesInCycle = [] } = useQuery({
    queryKey: ["expenses-dashboard", membership?.group_id, currentCompetenceKey],
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

  const {
    data: adminData,
    isLoading,
    error,
    refetch,
  } = useQuery<AdminDashboardData | null>({
    queryKey: adminDashboardQueryKey,
    queryFn: async () => {
      if (!isAdmin || !membership?.group_id) return null;

      if (modoGestao === 'p2p') {
        const [membersRes, p2pMatrixRes] = await Promise.all([
          supabase.from("group_member_profiles").select("id, full_name, avatar_url").eq("group_id", membership.group_id),
          supabase.rpc("get_group_p2p_matrix" as any, { _group_id: membership.group_id }),
        ]);
  
        if (membersRes.error) throw membersRes.error;
        if (p2pMatrixRes.error) throw p2pMatrixRes.error;
  
        return {
          members: (membersRes.data || []).map(m => ({ ...m, user_id: m.id, balance: 0, accrued_debt: 0, current_cycle_owed: 0, current_cycle_paid: 0, previous_debt: 0, total_owed: 0, total_paid: 0, active: true, profile: m, role: 'morador' })),
          p2pMatrix: p2pMatrixRes.data || [],
          pendingPaymentsCount: 0, exMembersDebt: 0, departuresCount: 0, redistributedCount: 0, lowStockCount: 0, cycleSplits: [], pendingSplits: [], memberPaymentsByCompetence: {}, nonCriticalWarnings: [],
        };
      }

      // --- Centralized Mode Logic ---
      const [membersRes, rolesRes, cycleSplitsRes, balancesRes, profilesRes, pendingSplitsRes, departuresRes, inventoryRes, allPaymentsRes] = await Promise.all([
        supabase.from("group_members").select("user_id, active").eq("group_id", membership.group_id).eq("active", true),
        supabase.from("user_roles").select("user_id, role").eq("group_id", membership.group_id),
        supabase.from("expense_splits").select("*, expenses!inner(*)").eq("expenses.group_id", membership.group_id).eq("expenses.expense_type", "collective").eq("expenses.competence_key", currentCompetenceKey),
        supabase.rpc("get_admin_member_competence_balances", { _group_id: membership.group_id, _competence_key: currentCompetenceKey }),
        supabase.from("group_member_profiles").select("id, full_name, avatar_url").eq("group_id", membership.group_id),
        supabase.from("expense_splits").select("*, expenses!inner(*)").eq("expenses.group_id", membership.group_id).eq("expenses.expense_type", "collective"),
        supabase.from("audit_log").select("created_at, details").eq("group_id", membership.group_id).eq("action", "remove_member").gte("created_at", cycleStart.toISOString()).lt("created_at", cycleEnd.toISOString()),
        supabase.from("inventory_items").select("quantity, min_quantity").eq("group_id", membership.group_id),
        supabase.from("payments").select("*, expense_splits(expenses(expense_type))").eq("group_id", membership.group_id).in("status", ["pending", "confirmed"]),
      ]);

      const errors = [membersRes, rolesRes, cycleSplitsRes, balancesRes, profilesRes, pendingSplitsRes, departuresRes, inventoryRes, allPaymentsRes].filter(res => res.error);
      if (errors.length > 0) {
        console.error("Admin data fetch errors", errors.map(e => e.error));
        throw new Error("Falha ao carregar dados administrativos para o modo centralizado.");
      }

      const cycleSplits = (cycleSplitsRes.data || []) as any[];
      const pendingSplits = (pendingSplitsRes.data || []) as any[];
      const payments = allPaymentsRes.data || [];

      const memberPaymentsByCompetence = payments
        .filter((p) => p.status === "confirmed" && p.paid_by && p.competence_key)
        .reduce((acc: Record<string, Record<string, number>>, payment) => {
          const userId = payment.paid_by!;
          const competenceKey = payment.competence_key!;
          const amount = Number(payment.amount || 0);
          if (!acc[userId]) acc[userId] = {};
          acc[userId][competenceKey] = (acc[userId][competenceKey] || 0) + amount;
          return acc;
        }, {});

      const balancesByUser = new Map((balancesRes.data || []).map((row: any) => [row.user_id, row]));
      const cycleBalances = (membersRes.data || []).map((m) => {
        const userCycleSplits = cycleSplits.filter((s) => s.user_id === m.user_id);
        const rpcBalance = balancesByUser.get(m.user_id);
        const cycleOwedFallback = userCycleSplits.reduce((acc, s) => acc + Number(s.amount || 0), 0);
        const paidSplitsTotalCycle = userCycleSplits.reduce((acc, s) => acc + (s.status === "paid" ? Number(s.amount || 0) : 0), 0);
        const currentCyclePaid = Math.max(Number(rpcBalance?.current_cycle_paid || 0), paidSplitsTotalCycle);
        const currentCycleOwed = Number(rpcBalance?.current_cycle_owed ?? cycleOwedFallback);
        const previousDebt = Number(rpcBalance?.previous_debt || 0);
        const accruedDebt = previousDebt + currentCycleOwed - currentCyclePaid;
        return { ...m, previous_debt: previousDebt, current_cycle_owed: currentCycleOwed, current_cycle_paid: currentCyclePaid, accrued_debt: accruedDebt, total_owed: currentCycleOwed, total_paid: currentCyclePaid, balance: -accruedDebt };
      });

      const members = cycleBalances.map(m => ({
        ...m,
        profile: (profilesRes.data || []).find(p => p.id === m.user_id) || null,
        role: (rolesRes.data || []).find(r => r.user_id === m.user_id)?.role ?? 'morador'
      }));

      const pendingPaymentsCount = payments.filter(p => p.status === 'pending').length;
      const departuresCount = (departuresRes.data || []).length;
      const redistributedCount = (departuresRes.data || []).reduce((sum: number, log: any) => sum + (Number(log?.details?.redistributed_pending_splits || 0)), 0);
      const lowStockCount = (inventoryRes.data || []).filter((i) => Number(i.quantity) <= Number(i.min_quantity)).length;
      
      const activeUserIds = new Set(members.map(m => m.user_id));
      const exMembersDebt = (pendingSplits || []).filter((s) => !activeUserIds.has(s.user_id)).reduce((sum, s) => sum + Number(s.amount || 0), 0);

      return {
        members,
        p2pMatrix: [],
        pendingPaymentsCount,
        exMembersDebt,
        departuresCount,
        redistributedCount,
        lowStockCount,
        cycleSplits,
        pendingSplits,
        memberPaymentsByCompetence,
        nonCriticalWarnings: [],
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
          <p className="font-medium text-foreground">Dados administrativos indisponíveis para este ciclo.</p>
          <p className="text-sm text-muted-foreground">Nenhum dado foi retornado no momento. Atualize para tentar novamente.</p>
          <button type="button" onClick={() => refetch()} className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90">Atualizar dados</button>
        </div>
      )}
    </div>
  );
}