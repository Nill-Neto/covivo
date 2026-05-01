import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { AdminTab } from "@/components/dashboard/AdminTab";
import { useCycleDates } from "@/hooks/useCycleDates";
import { formatCompetenceKey } from "@/lib/cycleDates";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AdminDashboardData, CollectiveExpense } from "@/types/admin";

export default function Admin() {
  const { membership, isAdmin, profile } = useAuth();
  const [heroCompact, setHeroCompact] = useState(false);
  
  const { currentDate, setCurrentDate, cycleStart, cycleEnd, cycleLimitDate, nextMonth, prevMonth, closingDay } = useCycleDates(membership?.group_id);
  const currentCompetenceKey = formatCompetenceKey(currentDate);

  const { data: adminData, isLoading, error, refetch } = useQuery<AdminDashboardData | null>({
    queryKey: ["admin-dashboard-data", membership?.group_id, currentCompetenceKey],
    queryFn: async () => {
      if (!isAdmin || !membership?.group_id) return null;

      const { data, error: rpcError } = await supabase.rpc("fetch_admin_dashboard_metrics", {
        _group_id: membership.group_id,
        _competence_key: currentCompetenceKey,
      });

      if (rpcError) {
        console.error('Error calling fetch_admin_dashboard_metrics RPC:', rpcError);
        throw new Error(`Erro ao carregar dados administrativos: ${rpcError.message}`);
      }
      return data as unknown as AdminDashboardData | null;
    },
    enabled: !!membership?.group_id && isAdmin
  });

  const { data: collectiveExpenses = [] } = useQuery<CollectiveExpense[]>({
    queryKey: ["admin-expenses", membership?.group_id, currentCompetenceKey],
    queryFn: async () => {
      if (!isAdmin || !membership?.group_id) return [];
      const { data, error } = await supabase
        .from("expenses")
        .select("id, title, amount, category, purchase_date")
        .eq("group_id", membership.group_id)
        .eq("expense_type", "collective")
        .eq("competence_key", currentCompetenceKey);
      if (error) throw error;
      return data as CollectiveExpense[];
    },
    enabled: !!membership?.group_id && isAdmin,
  });

  const totalMonthExpenses = collectiveExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

  if (!membership) {
    return <div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  }
  if (!isAdmin) {
    return <div className="p-8 text-center text-foreground">Acesso restrito a administradores.</div>;
  }

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  }

  if (error) {
    return (
      <div className="space-y-4 animate-in fade-in duration-500">
        <DashboardHeader userName={profile?.full_name} groupName={membership?.group_name} currentDate={currentDate} cycleStart={cycleStart} cycleEnd={cycleEnd} cycleLimitDate={cycleLimitDate} onNextMonth={nextMonth} onPrevMonth={prevMonth} onDateSelect={setCurrentDate} onCompactChange={setHeroCompact} />
        <Card className="border-destructive/40 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Não foi possível carregar os dados administrativos.
            </CardTitle>
            <CardDescription className="text-destructive/80">
              Ocorreu um erro inesperado ao consultar o banco de dados.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Código de referência: <code className="bg-destructive/10 p-1 rounded">ADMIN_LOAD_FAILED_RPC</code></p>
            <p className="text-xs text-muted-foreground mt-2">Ações sugeridas:</p>
            <ul className="text-xs text-muted-foreground list-disc pl-5 mt-1">
              <li>Verificar RPC `fetch_admin_dashboard_metrics` no Supabase.</li>
              <li>Verificar grants de segurança para o usuário autenticado.</li>
              <li>Verificar se a migration da função foi aplicada.</li>
            </ul>
            {import.meta.env.DEV && (
              <pre className="mt-4 text-xs bg-muted p-2 rounded-md overflow-auto">
                {error instanceof Error ? error.message : "Erro desconhecido"}
              </pre>
            )}
            <Button onClick={() => refetch()} className="mt-4">Tentar novamente</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <DashboardHeader userName={profile?.full_name} groupName={membership?.group_name} currentDate={currentDate} cycleStart={cycleStart} cycleEnd={cycleEnd} cycleLimitDate={cycleLimitDate} onNextMonth={nextMonth} onPrevMonth={prevMonth} onDateSelect={setCurrentDate} onCompactChange={setHeroCompact} />
      {adminData && (
        <AdminTab
          groupId={membership.group_id}
          modoGestao={membership.group_modo_gestao}
          members={adminData.members}
          p2pMatrix={adminData.p2pMatrix}
          collectiveExpenses={collectiveExpenses}
          totalMonthExpenses={totalMonthExpenses}
          cycleStart={cycleStart}
          cycleEnd={cycleEnd}
          currentDate={currentDate}
          closingDay={closingDay}
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
      )}
    </div>
  );
}