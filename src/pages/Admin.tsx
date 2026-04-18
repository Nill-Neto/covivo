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
  const adminLoadErrorCode = "ADMIN_LOAD_FAILED_RPC";

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

      const dbStart = format(cycleStart, "yyyy-MM-dd");
      const dbEnd = format(cycleEnd, "yyyy-MM-dd");

      const [membersRes, rolesRes, cycleSplitsRes, pendingSplitsRes, departuresRes, inventoryRes, balancesRes] = await Promise.all([
        supabase.from("group_members").select("user_id, active").eq("group_id", membership.group_id).eq("active", true),
        supabase.from("user_roles").select("user_id, role").eq("group_id", membership.group_id),
        supabase
          .from("expense_splits")
          .select("id, user_id, amount, status, expenses!inner(id, title, description, amount, category, group_id, expense_type, purchase_date, competence_key)")
          .eq("expenses.group_id", membership.group_id)
          .eq("expenses.expense_type", "collective")
          .eq("expenses.competence_key", currentCompetenceKey),
        supabase
          .from("expense_splits")
          .select("id, user_id, amount, status, expenses!inner(id, title, description, amount, category, group_id, expense_type, purchase_date, competence_key)")
          .eq("status", "pending")
          .eq("expenses.group_id", membership.group_id)
          .eq("expenses.expense_type", "collective"),
        supabase
          .from("audit_log")
          .select("created_at, details")
          .eq("group_id", membership.group_id)
          .eq("action", "remove_member")
          .gte("created_at", cycleStart.toISOString())
          .lt("created_at", cycleEnd.toISOString()),
        supabase
          .from("inventory_items")
          .select("quantity, min_quantity")
          .eq("group_id", membership.group_id),
        supabase.rpc("get_admin_member_competence_balances", {
          _group_id: membership.group_id,
          _competence_key: currentCompetenceKey
        })
      ]);

      const queryErrors = [
        { label: "group_members", error: membersRes.error },
        { label: "user_roles", error: rolesRes.error },
        { label: "expense_splits", error: cycleSplitsRes.error },
        { label: "audit_log", error: departuresRes.error },
        { label: "inventory_items", error: inventoryRes.error },
        { label: "get_admin_member_competence_balances", error: balancesRes.error },
      ].filter((entry) => Boolean(entry.error));

      if (queryErrors.length > 0) {
        const groupedErrors = Object.fromEntries(
          queryErrors.map((entry) => [entry.label, entry.error])
        );

        console.error("[Admin] Falha ao carregar dados administrativos", {
          queryKey: adminDashboardQueryKey,
          group_id: membership.group_id,
          competence_key: currentCompetenceKey,
          queryErrors: groupedErrors,
        });

        throw new Error("Falha ao carregar dados administrativos");
      }

      const cycleSplits = cycleSplitsRes.data || [];
      const pendingSplits = pendingSplitsRes.data || [];

      // Fetch all payments for this group. Filtering in JS is safer for complex OR conditions.
      const { data: allPayments, error: paymentsError } = await supabase.from("payments")
        .select("id, paid_by, amount, expense_split_id, status, notes, created_at, competence_key, expense_splits(expenses(expense_type))")
        .eq("group_id", membership.group_id)
        .in("status", ["pending", "confirmed"]);
      
      if (paymentsError) {
        console.error("[Admin] Payments fetch error", {
          queryKey: adminDashboardQueryKey,
          group_id: membership.group_id,
          competence_key: currentCompetenceKey,
          error: paymentsError,
        });
      }
      
      const payments = allPayments || [];

      const balancesByUser = new Map(
        (balancesRes.data || []).map((row) => [row.user_id, row])
      );

      const cycleBalances = (membersRes.data || []).map((m) => {
        const userCycleSplits = cycleSplits.filter((s) => s.user_id === m.user_id);
        const rpcBalance = balancesByUser.get(m.user_id);
        const cycleOwedFallback = userCycleSplits.reduce((acc, s) => acc + Number(s.amount || 0), 0);
        const paidSplitsTotalCycle = userCycleSplits.reduce((acc, s) => acc + (s.status === "paid" ? Number(s.amount || 0) : 0), 0);
        const currentCyclePaid = Math.max(Number(rpcBalance?.current_cycle_paid || 0), paidSplitsTotalCycle);
        const currentCycleOwed = Number(rpcBalance?.current_cycle_owed ?? cycleOwedFallback);
        const previousDebt = Number(rpcBalance?.previous_debt || 0);
        const accruedDebt = previousDebt + currentCycleOwed - currentCyclePaid;

        return {
          ...m,
          previous_debt: previousDebt,
          current_cycle_owed: currentCycleOwed,
          current_cycle_paid: currentCyclePaid,
          accrued_debt: accruedDebt,
          total_owed: currentCycleOwed,
          total_paid: currentCyclePaid,
          balance: -accruedDebt,
        };
      });

      const userIds = membersRes.data?.map(m => m.user_id) ?? [];
      const { data: profiles, error: profilesError } = await supabase
        .from("group_member_profiles")
        .select("id, full_name, avatar_url")
        .eq("group_id", membership.group_id)
        .in("id", userIds);

      if (profilesError) {
        console.error("[Admin] Profiles fetch error", {
          queryKey: adminDashboardQueryKey,
          group_id: membership.group_id,
          competence_key: currentCompetenceKey,
          error: profilesError,
        });
        throw profilesError;
      }

      const members = cycleBalances.map(m => ({
        ...m,
        profile: profiles?.find(p => p.id === m.user_id),
        role: rolesRes.data?.find(r => r.user_id === m.user_id)?.role ?? 'morador'
      }));

      const pendingPaymentsCount = payments.filter(p => {
         if (p.status !== 'pending') return false;
         if (!p.expense_split_id) return true;
         // p.expense_splits might be an array or object depending on schema
         const split: any = p.expense_splits;
         const expenseType = Array.isArray(split)
           ? split[0]?.expenses?.expense_type
           : split?.expenses?.expense_type;
         return expenseType === 'collective';
      }).length;

      const departuresCount = (departuresRes.data || []).length;
      const redistributedCount = (departuresRes.data || []).reduce((sum: number, log: any) => {
        const value = Number(log?.details?.redistributed_pending_splits || 0);
        return sum + (Number.isFinite(value) ? value : 0);
      }, 0);

      const lowStockCount = (inventoryRes.data || []).filter((i: any) => Number(i.quantity) <= Number(i.min_quantity)).length;

      let exMembersDebt = 0;
      if (collectiveExpenses.length > 0) {
        const { data: exMembersSplits, error: exMembersSplitsError } = await supabase
          .from("expense_splits")
          .select("id, user_id, amount")
          .eq("status", "pending")
          .in("expense_id", collectiveExpenses.map(e => e.id));

        if (exMembersSplitsError) {
          console.error("[Admin] Ex-members splits fetch error", {
            queryKey: adminDashboardQueryKey,
            group_id: membership.group_id,
            competence_key: currentCompetenceKey,
            error: exMembersSplitsError,
          });
          throw exMembersSplitsError;
        }
          
        const activeUserIds = new Set(members.map(m => m.user_id));
        exMembersDebt = (exMembersSplits || [])
          .filter((s: any) => !activeUserIds.has(s.user_id))
          .reduce((sum: number, s: any) => sum + Number(s.amount || 0), 0);
      }

      return {
        members,
        pendingPaymentsCount,
        exMembersDebt,
        departuresCount,
        redistributedCount,
        lowStockCount,
        cycleSplits,
        pendingSplits,
      };
    },
    enabled: !!membership?.group_id && !!collectiveExpenses && isAdmin
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
            Tente novamente em alguns instantes. Código de referência: <span className="font-medium">{adminLoadErrorCode}</span>.
          </p>
          <div className="rounded-md border border-destructive/20 bg-background/80 p-3 text-left text-sm text-muted-foreground">
            <p className="mb-2 font-medium text-foreground">Checklist de suporte:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Verificar RPC.</li>
              <li>Verificar grants.</li>
              <li>Verificar migration aplicada.</li>
            </ul>
          </div>
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
        <AdminTab 
          members={adminData.members} 
          pendingPaymentsCount={adminData.pendingPaymentsCount}
          collectiveExpenses={collectiveExpenses}
          totalMonthExpenses={totalMonthExpenses}
          cycleStart={cycleStart}
          cycleEnd={cycleEnd}
          currentDate={currentDate}
          exMembersDebt={adminData.exMembersDebt}
          departuresCount={adminData.departuresCount}
          redistributedCount={adminData.redistributedCount}
          lowStockCount={adminData.lowStockCount}
          cycleSplits={adminData.cycleSplits}
          pendingSplits={adminData.pendingSplits}
          closingDay={closingDay}
        />
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
