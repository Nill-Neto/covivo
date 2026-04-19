import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Link } from "react-router-dom";
import { parseLocalDate } from "@/lib/utils";
import {
  Users, ArrowRight, RefreshCw, DollarSign, AlertTriangle,
  Receipt, Settings, ClipboardList, BarChart3,
  Clock, UserPlus, Scale, UserMinus, Package
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getCategoryLabel, CHART_COLORS, CATEGORY_COLORS } from "@/constants/categories";
import { useMemo, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from "recharts";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface AdminTabProps {
  members: any[];
  pendingPaymentsCount: number;
  collectiveExpenses: any[];
  totalMonthExpenses: number;
  cycleStart: Date;
  cycleEnd: Date;
  currentDate: Date;
  exMembersDebt: number;
  departuresCount: number;
  redistributedCount: number;
  lowStockCount: number;
  cycleSplits: any[];
  pendingSplits: any[];
  memberPaymentsByCompetence?: Record<string, Record<string, number>>;
  closingDay: number;
}

export function AdminTab({
  members,
  pendingPaymentsCount,
  collectiveExpenses,
  totalMonthExpenses,
  cycleStart,
  cycleEnd,
  currentDate,
  exMembersDebt,
  departuresCount,
  redistributedCount,
  lowStockCount,
  cycleSplits,
  pendingSplits,
  memberPaymentsByCompetence = {},
  closingDay,
}: AdminTabProps) {
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const currentCompetenceKey = format(currentDate, "yyyy-MM");

  // Ordena os membros pelo saldo acumulado (negativos primeiro)
  const sortedMembers = useMemo(() =>
    [...members].sort((a, b) => (a.accumulated_balance ?? a.balance) - (b.accumulated_balance ?? b.balance)),
    [members]
  );

  const selectedMember = useMemo(() => 
    sortedMembers.find(m => m.user_id === selectedMemberId), 
  [sortedMembers, selectedMemberId]);

  // Pega apenas as despesas desta competência para este morador
  const selectedMemberSplits = useMemo(() => {
    if (!selectedMemberId || !cycleSplits) return [];
    return cycleSplits
      .filter(s => s.user_id === selectedMemberId)
      .sort((a, b) => new Date(b.expenses?.purchase_date || 0).getTime() - new Date(a.expenses?.purchase_date || 0).getTime());
  }, [selectedMemberId, cycleSplits]);

  const selectedMemberPreviousSplits = useMemo(() => {
    if (!selectedMemberId || !pendingSplits) return [];
    return pendingSplits
      .filter((s: any) => s.user_id === selectedMemberId && s.expenses?.competence_key !== currentCompetenceKey)
      .sort((a: any, b: any) => (b.expenses?.competence_key || "").localeCompare(a.expenses?.competence_key || ""));
  }, [currentCompetenceKey, pendingSplits, selectedMemberId]);

  const selectedPreviousByCompetence = useMemo(() => {
    const previousDebtFallback = Number(selectedMember?.previous_debt || 0);
    const selectedMemberPaymentsByCompetence = selectedMemberId
      ? (memberPaymentsByCompetence[selectedMemberId] || {})
      : {};

    const groups: Record<string, any[]> = {};
    selectedMemberPreviousSplits.forEach((split: any) => {
      const key = split.expenses?.competence_key || "sem-competencia";
      groups[key] = groups[key] || [];
      groups[key].push(split);
    });

    const grouped = Object.entries(groups)
      .map(([competenceKey, items]) => ({
        competenceKey,
        items: items.sort((a, b) => new Date(b.expenses?.purchase_date || 0).getTime() - new Date(a.expenses?.purchase_date || 0).getTime()),
        totalCompetence: items.reduce((acc, s) => acc + Number(s.amount || 0), 0),
        totalPaidFromSplits: items.reduce((acc, s) => acc + (s.status === "paid" ? Number(s.amount || 0) : 0), 0),
        totalPaidFromPayments: Number(selectedMemberPaymentsByCompetence[competenceKey] || 0),
      }))
      .map((group) => {
        const totalPaid = Math.max(group.totalPaidFromSplits, group.totalPaidFromPayments);
        return {
          ...group,
          totalPaid,
          totalPending: Math.max(group.totalCompetence - totalPaid, 0),
          pendingItems: group.items.filter((split: any) => split.status !== "paid"),
        };
      })
      .filter((group) => group.totalPending > 0.05)
      .sort((a, b) => b.competenceKey.localeCompare(a.competenceKey));

    if (grouped.length > 0) return grouped;

    if (previousDebtFallback > 0.05) {
      return [{
        competenceKey: "saldo-anterior",
        items: [],
        totalCompetence: previousDebtFallback,
        totalPaidFromSplits: 0,
        totalPaidFromPayments: 0,
        totalPaid: 0,
        totalPending: previousDebtFallback,
        pendingItems: [],
        synthetic: true,
      }];
    }

    return [];
  }, [memberPaymentsByCompetence, selectedMember?.previous_debt, selectedMemberId, selectedMemberPreviousSplits]);

  const selectedHeaderTotals = useMemo(() => {
    const currentCompetenceTotal = Number(selectedMember?.total_owed ?? selectedMember?.current_cycle_owed ?? 0);
    const currentCompetencePaidFallback = selectedMemberId
      ? Number(memberPaymentsByCompetence[selectedMemberId]?.[currentCompetenceKey] || 0)
      : 0;
    const currentCompetencePaid = Math.max(
      Number(selectedMember?.total_paid ?? selectedMember?.current_cycle_paid ?? 0),
      currentCompetencePaidFallback
    );
    const previousPendingTotal = selectedPreviousByCompetence.reduce((acc, group) => acc + group.totalPending, 0);
    const totalConsolidated = Math.max(previousPendingTotal + currentCompetenceTotal - currentCompetencePaid, 0);

    return {
      currentCompetenceTotal,
      previousPendingTotal,
      currentCompetencePaid,
      totalConsolidated,
    };
  }, [currentCompetenceKey, memberPaymentsByCompetence, selectedMember, selectedMemberId, selectedPreviousByCompetence]);

  const formatCompetenceLabel = (key?: string) => {
    if (!key || !/^\d{4}-\d{2}$/.test(key)) return "Competência não informada";
    const [y, m] = key.split("-");
    return format(new Date(Number(y), Number(m) - 1, 1), "MMMM/yyyy", { locale: ptBR });
  };

  const getBalanceStyle = (value: number) => {
    if (value < -0.05) {
      return { label: "Débito", className: "text-destructive", badgeClass: "destructive" as const };
    }
    if (value > 0.05) {
      return { label: "Crédito", className: "text-success", badgeClass: "secondary" as const };
    }
    return { label: "Neutro", className: "text-muted-foreground", badgeClass: "outline" as const };
  };

  const totalReceivable = sortedMembers.reduce(
    (acc, m) => acc + ((m.accumulated_balance ?? m.balance) < -0.01 ? Math.abs(m.accumulated_balance ?? m.balance) : 0), 0
  );

  const membersInDebt = sortedMembers.filter(m => (m.accumulated_balance ?? m.balance) < -0.05);
  const collectRate = members.length > 0
    ? Math.round(((members.length - membersInDebt.length) / members.length) * 100)
    : 100;

  const recentExpenses = useMemo(() =>
    [...collectiveExpenses]
      .sort((a, b) => parseLocalDate(b.purchase_date).getTime() - parseLocalDate(a.purchase_date).getTime())
      .slice(0, 10),
    [collectiveExpenses]
  );

  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    collectiveExpenses.forEach(e => {
      const label = getCategoryLabel(e.category);
      map[label] = (map[label] || 0) + Number(e.amount);
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [collectiveExpenses]);

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Quick Actions */}
      <Card>
        <CardContent className="p-0">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x">
            <QuickActionLink to="/expenses" icon={ClipboardList} label="Gerenciar Despesas" desc="Lançar e editar despesas coletivas" />
            <QuickActionLink to="/payments?filter=pending" icon={DollarSign} label="Confirmar Pagamentos" desc="Aprovar ou recusar comprovantes" />
            <QuickActionLink to="/members" icon={Users} label="Moradores" desc="Gerenciar membros do grupo" />
            <QuickActionLink to="/recurring" icon={RefreshCw} label="Despesas Recorrentes" desc="Contas fixas e assinaturas" />
            <QuickActionLink to="/invites" icon={UserPlus} label="Convites" desc="Convidar novos moradores" />
            <QuickActionLink to="/settings" state={{ tab: "group" }} icon={Settings} label="Configurações" desc="Regras de rateio e ciclo" />
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Despesas do Ciclo */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Despesas do Ciclo
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              R$ {totalMonthExpenses.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {collectiveExpenses.length} lançamento{collectiveExpenses.length !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        {/* Total a Receber */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Total a Receber
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold tabular-nums ${totalReceivable > 0 ? "text-destructive" : "text-foreground"}`}>
              R$ {totalReceivable.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {membersInDebt.length} pendência{membersInDebt.length !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        {/* Pagamentos Pendentes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              A Confirmar
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{pendingPaymentsCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {pendingPaymentsCount > 0 ? "Aguardando sua ação" : "Nenhum pendente"}
            </p>
            {pendingPaymentsCount > 0 && (
              <Button variant="link" className="p-0 h-auto text-xs mt-1 text-warning" asChild>
                <Link to="/payments?filter=pending">Confirmar <ArrowRight className="h-3 w-3 ml-1" /></Link>
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Taxa de Adimplência */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Adimplência (Ciclo)
            </CardTitle>
            <Scale className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{collectRate}%</div>
            <Progress value={collectRate} className="h-1.5 mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {members.length - membersInDebt.length}/{members.length} em dia
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Movimentações de Moradores */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Ex-moradores (débito)
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold tabular-nums ${exMembersDebt > 0 ? "text-destructive" : "text-foreground"}`}>
              R$ {exMembersDebt.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Pendências abertas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Redistribuições
            </CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{redistributedCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Splits após saídas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Saídas
            </CardTitle>
            <UserMinus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{departuresCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Neste período</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Estoque Crítico
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold tabular-nums ${lowStockCount > 0 ? "text-warning" : "text-foreground"}`}>
              {lowStockCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Abaixo do mínimo</p>
            {lowStockCount > 0 && (
              <Button variant="link" className="p-0 h-auto text-xs mt-1 text-warning" asChild>
                <Link to="/inventory">Repor estoque <ArrowRight className="h-3 w-3 ml-1" /></Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Saldo dos Moradores - 2 cols */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" /> Resumo da Competência
              </CardTitle>
              <Badge variant="outline" className="text-xs font-normal">
                {members.length} ativo{members.length !== 1 ? "s" : ""}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {`Competência atual: ${format(currentDate, "MMM/yyyy", { locale: ptBR })} · Valores sem acumular pendências anteriores`} · Clique no morador para detalhes
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {sortedMembers.map(member => {
                const currentBalance = Number(member.balance ?? 0);
                const previousDebt = Number(member.previous_debt ?? 0);
                const competenceTotal = Number(member.total_owed ?? 0);
                const competencePaidFallback = Number(memberPaymentsByCompetence[member.user_id]?.[currentCompetenceKey] || 0);
                const competencePaid = Math.max(Number(member.total_paid ?? 0), competencePaidFallback);
                const competencePending = Math.max(competenceTotal - competencePaid, 0);
                const status = getBalanceStyle(currentBalance);
                const isDebt = currentBalance < -0.05;

                return (
                  <div
                    key={member.user_id}
                    onClick={() => setSelectedMemberId(member.user_id)}
                    className={`flex items-center justify-between px-6 py-3 transition-colors hover:bg-muted/50 cursor-pointer ${isDebt ? "bg-destructive/5" : ""}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-9 w-9 border border-border">
                          <AvatarImage src={member.profile?.avatar_url} />
                          <AvatarFallback className="text-xs font-medium bg-muted">
                          {member.profile?.full_name?.substring(0, 2)?.toUpperCase() || "?"}
                          </AvatarFallback>
                        </Avatar>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{member.profile?.full_name}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground capitalize">
                          {member.role === "admin" ? "Admin" : "Morador"}
                          </span>
                          <Badge variant={status.badgeClass} className="text-[10px] h-4 px-1.5">
                            {status.label}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0 ml-4">
                      <span className={`font-semibold text-sm tabular-nums ${status.className}`}>
                        {currentBalance > 0.05 ? "+" : currentBalance < -0.05 ? "-" : ""}R$ {Math.abs(currentBalance).toFixed(2)}
                      </span>
                      <p className="text-[11px] text-muted-foreground tabular-nums mt-1">
                        Total competência: R$ {competenceTotal.toFixed(2)}
                      </p>
                      <p className="text-[11px] text-muted-foreground tabular-nums">
                        Total pago: R$ {competencePaid.toFixed(2)}
                      </p>
                      <p className="text-[11px] font-medium tabular-nums">
                        Total pendente: R$ {competencePending.toFixed(2)}
                      </p>
                      <p className="text-[11px] text-muted-foreground tabular-nums">
                        Pendências anteriores: R$ {previousDebt.toFixed(2)}
                      </p>
                    </div>
                  </div>
                );
              })}
              {sortedMembers.length === 0 && (
                <p className="text-sm text-muted-foreground px-6 py-8 text-center">
                  Nenhum morador encontrado.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Distribuição por Categoria */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4" /> Distribuição por Categoria
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[250px] relative">
              {categoryBreakdown.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie 
                        data={categoryBreakdown} 
                        dataKey="value" 
                        nameKey="name" 
                        cx="50%" 
                        cy="50%" 
                        innerRadius={50} 
                        outerRadius={70} 
                        paddingAngle={5}
                        stroke="none"
                        cornerRadius={5}
                      >
                        {categoryBreakdown.map((entry, i) => (
                          <Cell 
                            key={i} 
                            fill={CATEGORY_COLORS[entry.name] || CHART_COLORS[i % CHART_COLORS.length]} 
                          />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        formatter={(v: number) => `R$ ${v.toFixed(2)}`} 
                        contentStyle={{ 
                          borderRadius: "8px", 
                          border: "none", 
                          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                          fontSize: "12px"
                        }}
                        itemStyle={{ color: "#1e293b" }}
                      />
                      <Legend 
                        verticalAlign="bottom" 
                        height={36} 
                        iconType="circle"
                        formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center Label */}
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-[60%] text-center pointer-events-none">
                    <span className="text-[10px] text-muted-foreground block">Total</span>
                    <span className="text-sm font-bold">R$ {totalMonthExpenses.toFixed(0)}</span>
                  </div>
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm">
                  <span className="opacity-50">Sem dados no período</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Últimas Despesas Coletivas */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Receipt className="h-4 w-4" /> Últimas Despesas
              </CardTitle>
              <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
                <Link to="/expenses">Ver todas</Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[250px] pr-2 px-2">
                <div className="space-y-1">
                  {recentExpenses.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">Nenhuma despesa registrada.</p>
                  ) : (
                    recentExpenses.map(expense => (
                      <div key={expense.id} className="flex items-center justify-between py-2.5 px-3 group hover:bg-muted/50 rounded-md transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                            <Receipt className="h-3.5 w-3.5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium leading-none truncate max-w-[120px]">{expense.title}</p>
                            <p className="text-xs text-muted-foreground mt-1 truncate">
                              {getCategoryLabel(expense.category)} • {format(parseLocalDate(expense.purchase_date), "dd MMM", { locale: ptBR })}
                            </p>
                          </div>
                        </div>
                        <span className="text-sm font-semibold tabular-nums flex-shrink-0 ml-3">
                          R$ {Number(expense.amount).toFixed(2)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Detalhamento do Morador */}
      <Dialog open={!!selectedMemberId} onOpenChange={(open) => !open && setSelectedMemberId(null)}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden flex flex-col max-h-[85vh]">
          <DialogHeader className="px-5 pt-5 pb-4 shrink-0 border-b">
            <DialogTitle className="text-lg font-semibold text-foreground">
              Detalhamento da Competência
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-0.5 capitalize">
              {selectedMember?.profile?.full_name} • {format(currentDate, "MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </DialogHeader>

          <div className="px-5 py-3 bg-muted/10 grid grid-cols-2 gap-4 border-b shrink-0">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Total competência atual</p>
              <p className="text-sm font-semibold tabular-nums">R$ {selectedHeaderTotals.currentCompetenceTotal.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Pendências anteriores</p>
              <p className="text-sm font-semibold tabular-nums text-destructive">R$ {selectedHeaderTotals.previousPendingTotal.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Total pago (comp. atual)</p>
              <p className="text-sm font-semibold tabular-nums text-success">R$ {selectedHeaderTotals.currentCompetencePaid.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Total consolidado</p>
              <p className="text-sm font-semibold tabular-nums">R$ {selectedHeaderTotals.totalConsolidated.toFixed(2)}</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-muted/5 divide-y divide-border/50">
            <div className="px-5 py-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pendências anteriores</p>
                <Badge variant="outline" className="text-[10px]">
                  {selectedPreviousByCompetence.length} competência{selectedPreviousByCompetence.length !== 1 ? "s" : ""}
                </Badge>
              </div>
              {selectedPreviousByCompetence.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem pendências anteriores.</p>
              ) : (
                <div className="space-y-3">
                  {selectedPreviousByCompetence.map(group => (
                    <div key={group.competenceKey} className="rounded-lg border bg-background/70">
                      <div className="px-3 py-2 border-b">
                        <p className="text-xs font-medium capitalize text-muted-foreground">
                          {group.synthetic ? "Saldo anterior consolidado" : `Competência ${formatCompetenceLabel(group.competenceKey)}`}
                        </p>
                      </div>
                      <div className="px-3 py-2.5 grid grid-cols-3 gap-2 text-[11px] border-b">
                        <div>
                          <p className="text-muted-foreground">Total competência</p>
                          <p className="font-semibold tabular-nums">R$ {group.totalCompetence.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Total pago</p>
                          <p className="font-semibold tabular-nums text-success">R$ {group.totalPaid.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Total pendente</p>
                          <p className="font-semibold tabular-nums text-destructive">R$ {group.totalPending.toFixed(2)}</p>
                        </div>
                      </div>
                      {group.items.length > 0 ? (
                        <Accordion type="single" collapsible className="w-full">
                          <AccordionItem value={`pending-${group.competenceKey}`} className="border-b-0">
                            <AccordionTrigger className="px-3 py-2 text-xs font-medium hover:no-underline">
                              Itens da competência ({group.items.length})
                            </AccordionTrigger>
                            <AccordionContent className="divide-y">
                              {group.items.map((split: any) => (
                                <div key={split.id} className="px-3 py-2.5">
                                  <div className="flex justify-between gap-2">
                                    <p className="text-sm">{split.expenses?.title || "Despesa sem título"}</p>
                                    <span className="text-sm font-semibold tabular-nums text-destructive">R$ {Number(split.amount).toFixed(2)}</span>
                                  </div>
                                </div>
                              ))}
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      ) : (
                        <div className="px-3 py-2 text-xs text-muted-foreground">
                          Sem detalhamento por item para este saldo anterior.
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-5 py-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Itens da competência atual ({format(currentDate, "MMM/yyyy", { locale: ptBR })})
              </p>
              {selectedMemberSplits.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma despesa rateada nesta competência.</p>
              ) : (
                <Accordion type="single" collapsible className="w-full rounded-lg border bg-background/70 px-1">
                  <AccordionItem value="current-competence-items" className="border-b-0">
                    <AccordionTrigger className="px-3 py-2 text-xs font-medium hover:no-underline">
                      Itens da competência atual ({selectedMemberSplits.length})
                    </AccordionTrigger>
                    <AccordionContent className="space-y-2 px-2 pb-2">
                      {selectedMemberSplits.map((split: any) => (
                        <div key={split.id} className="rounded-lg border px-3 py-2.5 bg-background/70">
                          <div className="flex justify-between items-start mb-1 gap-2">
                            <p className="text-sm font-medium text-foreground leading-tight">{split.expenses?.title || "Despesa sem título"}</p>
                            <div className="flex flex-col items-end shrink-0">
                              <span className="font-semibold text-sm tabular-nums whitespace-nowrap text-destructive">
                                R$ {Number(split.amount).toFixed(2)}
                              </span>
                              <span className="text-[10px] text-muted-foreground tabular-nums whitespace-nowrap mt-0.5">
                                de R$ {Number(split.expenses?.amount || 0).toFixed(2)}
                              </span>
                            </div>
                          </div>
                          {split.expenses?.description && (
                            <p className="text-xs text-muted-foreground mb-2.5 leading-snug pr-8">{split.expenses.description}</p>
                          )}
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-normal">
                              {getCategoryLabel(split.expenses?.category)}
                            </Badge>
                            <span>{split.expenses?.purchase_date ? format(parseLocalDate(split.expenses.purchase_date), "dd/MM/yyyy") : "Data n/d"}</span>
                          </div>
                        </div>
                      ))}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              )}
            </div>
          </div>
          
          <div className="px-5 py-4 bg-muted/20 border-t shrink-0 flex justify-between items-center shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
            <span className="text-sm font-medium text-muted-foreground">Total acumulado</span>
            <span className={`text-lg font-bold ${getBalanceStyle(selectedMember?.accumulated_balance ?? selectedMember?.balance ?? 0).className}`}>
              R$ {Math.abs(selectedMember?.accumulated_balance ?? selectedMember?.balance ?? 0).toFixed(2)}
            </span>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function QuickActionLink({ to, state, icon: Icon, label, desc }: { to: string; state?: any; icon: any; label: string; desc: string }) {
  return (
    <Link to={to} state={state} className="flex items-center gap-3 px-6 py-4 hover:bg-muted/50 transition-colors group">
      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium group-hover:text-primary transition-colors">{label}</p>
        <p className="text-xs text-muted-foreground truncate">{desc}</p>
      </div>
    </Link>
  );
}