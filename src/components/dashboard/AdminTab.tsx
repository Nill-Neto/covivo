import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";
import {
  Users, ArrowRight, RefreshCw, DollarSign, AlertTriangle,
  TrendingUp, Receipt, Settings, ClipboardList, BarChart3,
  CheckCircle2, Clock, ChevronRight, FileText, UserPlus, Scale,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getCategoryLabel, CATEGORY_COLORS, CHART_COLORS } from "@/constants/categories";
import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface AdminTabProps {
  memberBalances: any[];
  members: any[];
  pendingPaymentsCount: number;
  collectiveExpenses: any[];
  totalMonthExpenses: number;
  cycleStart: Date;
  cycleEnd: Date;
  currentDate: Date;
}

export function AdminTab({
  memberBalances,
  members,
  pendingPaymentsCount,
  collectiveExpenses,
  totalMonthExpenses,
  cycleStart,
  cycleEnd,
  currentDate,
}: AdminTabProps) {
  const queryClient = useQueryClient();

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-dashboard-data"] });
    queryClient.invalidateQueries({ queryKey: ["expenses-dashboard"] });
  };

  const membersWithBalance = useMemo(() =>
    members.map(m => {
      const bal = memberBalances.find(b => b.user_id === m.user_id);
      return {
        ...m,
        balance: bal ? Number(bal.balance) : 0,
        total_owed: bal ? Number(bal.total_owed) : 0,
        total_paid: bal ? Number(bal.total_paid) : 0,
      };
    }).sort((a, b) => a.balance - b.balance),
    [members, memberBalances]
  );

  const totalReceivable = membersWithBalance.reduce(
    (acc, m) => acc + (m.balance < -0.01 ? Math.abs(m.balance) : 0), 0
  );

  const membersInDebt = membersWithBalance.filter(m => m.balance < -0.05);
  const collectRate = members.length > 0
    ? Math.round(((members.length - membersInDebt.length) / members.length) * 100)
    : 100;

  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    collectiveExpenses.forEach(e => {
      const label = getCategoryLabel(e.category);
      map[label] = (map[label] || 0) + Number(e.amount);
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [collectiveExpenses]);

  const cycleLabel = format(currentDate, "MMMM 'de' yyyy", { locale: ptBR });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b pb-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground tracking-tight">Painel Administrativo</h2>
          <p className="text-sm text-muted-foreground capitalize mt-1">
             Gestão do ciclo: <span className="font-medium text-foreground">{cycleLabel}</span>
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} className="h-9 gap-2 shadow-sm hover:bg-muted/50">
          <RefreshCw className="h-3.5 w-3.5" /> Atualizar
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Despesas do Ciclo */}
        <Card className="shadow-sm border-l-4 border-l-primary transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Despesas do Ciclo
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-1">
               <span className="text-sm font-medium text-muted-foreground">R$</span>
               <div className="text-2xl font-bold text-foreground">
                 {totalMonthExpenses.toFixed(2)}
               </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2 font-medium">
              {collectiveExpenses.length} lançamentos
            </p>
          </CardContent>
        </Card>

        {/* Total a Receber */}
        <Card className={cn("shadow-sm border-l-4 transition-all", totalReceivable > 0 ? "border-l-destructive" : "border-l-emerald-500")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total a Receber
            </CardTitle>
            <DollarSign className={cn("h-4 w-4", totalReceivable > 0 ? "text-destructive" : "text-emerald-500")} />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-1">
               <span className="text-sm font-medium text-muted-foreground">R$</span>
               <div className={cn("text-2xl font-bold", totalReceivable > 0 ? "text-destructive" : "text-foreground")}>
                 {totalReceivable.toFixed(2)}
               </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2 font-medium">
              {membersInDebt.length} pendências ativas
            </p>
          </CardContent>
        </Card>

        {/* Pagamentos Pendentes */}
        <Card className="shadow-sm border-l-4 border-l-amber-400 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              A Confirmar
            </CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{pendingPaymentsCount}</div>
            
            {pendingPaymentsCount > 0 ? (
               <div className="mt-2">
                 <Button variant="link" className="p-0 h-auto text-xs font-semibold text-amber-600 hover:text-amber-700" asChild>
                   <Link to="/payments?filter=pending">Confirmar Pagamentos <ArrowRight className="h-3 w-3 ml-1" /></Link>
                 </Button>
               </div>
            ) : (
               <p className="text-xs text-muted-foreground mt-2 font-medium">Nenhum pendente</p>
            )}
          </CardContent>
        </Card>

        {/* Taxa de Adimplência */}
        <Card className="shadow-sm border-l-4 border-l-indigo-500 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Adimplência
            </CardTitle>
            <Scale className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{collectRate}%</div>
            <Progress value={collectRate} className="h-1.5 mt-2 bg-indigo-100" indicatorClassName="bg-indigo-500" />
            <p className="text-xs text-muted-foreground mt-2 font-medium">
              {members.length - membersInDebt.length} de {members.length} moradores em dia
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Saldo dos Moradores - 2 cols */}
        <Card className="lg:col-span-2 shadow-sm border bg-card flex flex-col">
          <CardHeader className="border-b bg-muted/30 pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" /> Saldo dos Moradores
              </CardTitle>
              <Badge variant="secondary" className="text-[10px] font-normal px-2 bg-card border shadow-sm">
                {members.length} Ativos
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {membersWithBalance.map(member => {
                const isDebt = member.balance < -0.05;
                const isCredit = member.balance > 0.05;

                return (
                  <div
                    key={member.user_id}
                    className={cn(
                      "flex items-center justify-between px-6 py-4 transition-colors hover:bg-muted/30",
                      isDebt && "bg-destructive/5"
                    )}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <Avatar className="h-10 w-10 border shadow-sm">
                        <AvatarImage src={member.profile?.avatar_url} />
                        <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                          {member.profile?.full_name?.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-foreground truncate">{member.profile?.full_name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">
                            {member.role === "admin" ? "Administrador" : "Morador"}
                          </span>
                          {isDebt && (
                            <Badge variant="destructive" className="text-[10px] h-4 px-1 rounded-sm font-normal">
                              Pendente
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0 ml-4">
                      {isDebt ? (
                        <span className="font-bold text-sm text-destructive block">
                          - R$ {Math.abs(member.balance).toFixed(2)}
                        </span>
                      ) : isCredit ? (
                        <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400 block">
                          + R$ {member.balance.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-sm text-emerald-600 font-medium flex items-center justify-end gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Em dia
                        </span>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">
                        Rateio: R$ {member.total_owed.toFixed(2)}
                      </p>
                    </div>
                  </div>
                );
              })}
              {membersWithBalance.length === 0 && (
                <p className="text-sm text-muted-foreground px-6 py-10 text-center">
                  Nenhum morador encontrado.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions Card */}
          <Card className="shadow-sm border bg-card">
            <CardHeader className="border-b bg-muted/30 pb-3">
               <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Acesso Rápido</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
               <div className="divide-y divide-border">
                  <QuickActionLink to="/expenses" icon={ClipboardList} label="Despesas" />
                  <QuickActionLink to="/payments?filter=pending" icon={DollarSign} label="Pagamentos" />
                  <QuickActionLink to="/members" icon={Users} label="Moradores" />
                  <QuickActionLink to="/invites" icon={UserPlus} label="Convites" />
               </div>
            </CardContent>
          </Card>

          {/* Categoria de Despesas */}
          <Card className="shadow-sm border bg-card">
            <CardHeader className="border-b bg-muted/30 pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <BarChart3 className="h-4 w-4" /> Top Categorias
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {categoryBreakdown.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Sem despesas neste ciclo.</p>
              ) : (
                <div className="space-y-4">
                  {categoryBreakdown.map((cat, idx) => {
                    const pct = totalMonthExpenses > 0
                      ? Math.round((cat.value / totalMonthExpenses) * 100)
                      : 0;
                    return (
                      <div key={cat.name} className="group">
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="font-medium text-muted-foreground group-hover:text-foreground transition-colors">{cat.name}</span>
                          <span className="font-bold tabular-nums">
                            R$ {cat.value.toFixed(2)}
                          </span>
                        </div>
                        <Progress 
                           value={pct} 
                           className="h-1.5 bg-muted" 
                           indicatorClassName={cn("transition-all", `bg-[${CHART_COLORS[idx % CHART_COLORS.length]}]`)}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function QuickActionLink({ to, icon: Icon, label }: { to: string; icon: any; label: string }) {
  return (
    <Link to={to} className="flex items-center gap-3 px-6 py-3 hover:bg-muted/50 transition-all group hover:pl-7">
      <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
        <Icon className="h-3.5 w-3.5 text-primary" />
      </div>
      <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{label}</span>
      <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
    </Link>
  );
}
