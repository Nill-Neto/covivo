import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Link } from "react-router-dom";
import { cn, parseLocalDate } from "@/lib/utils";
import {
  Users, ArrowRight, RefreshCw, DollarSign,
  Receipt, Settings, ClipboardList, BarChart3,
  UserPlus, Shield, Scale, ArrowUpRight, ArrowDownLeft,
  type LucideIcon
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getCategoryLabel, CHART_COLORS, CATEGORY_COLORS } from "@/constants/categories";
import { useMemo, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AdminFinancialSummary } from "./AdminFinancialSummary";
import { DebtSimplificationModal } from "./DebtSimplificationModal";

interface AdminTabProps {
  modoGestao: 'centralized' | 'p2p';
  members: any[];
  p2pMatrix: { from_user_id: string, to_user_id: string, amount: number }[];
  collectiveExpenses: any[];
  totalMonthExpenses: number;
  cycleStart: Date;
  cycleEnd: Date;
  currentDate: Date;
  closingDay: number;
}

export function AdminTab({
  modoGestao,
  members,
  p2pMatrix,
  collectiveExpenses,
  totalMonthExpenses,
  currentDate,
}: AdminTabProps) {
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [isSimplifyModalOpen, setIsSimplifyModalOpen] = useState(false);
  const [hoveredSegmentLabel, setHoveredSegmentLabel] = useState<string | null>(null);

  const processedMembers = useMemo(() => {
    const memberMap = new Map(members.map(m => [m.id, { ...m, debts: [], credits: [], netBalance: 0 }]));

    p2pMatrix.forEach(entry => {
      const fromMember = memberMap.get(entry.from_user_id);
      const toMember = memberMap.get(entry.to_user_id);
      if (!fromMember || !toMember) return;

      fromMember.netBalance -= entry.amount;
      toMember.netBalance += entry.amount;

      fromMember.debts.push({ user: toMember, amount: entry.amount });
      toMember.credits.push({ user: fromMember, amount: entry.amount });
    });

    return Array.from(memberMap.values()).sort((a, b) => a.netBalance - b.netBalance);
  }, [members, p2pMatrix]);

  const selectedMember = useMemo(() => 
    processedMembers.find(m => m.id === selectedMemberId), 
  [processedMembers, selectedMemberId]);

  const totalReceivable = processedMembers.reduce(
    (acc, m) => acc + (m.netBalance > 0 ? m.netBalance : 0), 0
  );

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

  const donutData = categoryBreakdown.map((entry, index) => ({
    label: entry.name,
    value: entry.value,
    color: CATEGORY_COLORS[entry.name] || CHART_COLORS[index % CHART_COLORS.length],
  }));

  const activeSegment = donutData.find(d => d.label === hoveredSegmentLabel);
  const displayValue = activeSegment ? activeSegment.value : totalMonthExpenses;
  const displayLabel = activeSegment ? activeSegment.label : "Total";
  const displayPercentage = activeSegment && totalMonthExpenses > 0 ? (activeSegment.value / totalMonthExpenses) * 100 : 100;

  const getBalanceStyle = (value: number) => {
    if (value < -0.05) {
      return { label: "Débito", className: "text-destructive", badgeClass: "destructive" as const };
    }
    if (value > 0.05) {
      return { label: "Crédito", className: "text-success", badgeClass: "secondary" as const };
    }
    return { label: "Neutro", className: "text-muted-foreground", badgeClass: "outline" as const };
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">

      <AdminFinancialSummary
        totalExpenses={totalMonthExpenses}
        totalReceivable={totalReceivable}
        pendingPaymentsCount={0} // Placeholder
        exMembersDebt={0} // Placeholder
      />

      {modoGestao === 'p2p' && (
        <Button onClick={() => setIsSimplifyModalOpen(true)} variant="outline" className="w-full justify-center gap-2">
          <Scale className="h-4 w-4"/>
          Simplificar Dívidas do Grupo
        </Button>
      )}

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

      <div className="grid gap-4 md:grid-cols-12">
        <Card className="md:col-span-6 lg:col-span-6 flex flex-col">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" /> Distribuição por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col lg:flex-row items-center justify-center gap-6 p-4 pt-0">
            {donutData.length > 0 ? (
              <>
                <div className="relative h-[200px] w-[200px] shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie 
                        data={donutData} 
                        dataKey="value" 
                        nameKey="label" 
                        cx="50%" 
                        cy="50%" 
                        innerRadius={70} 
                        outerRadius={90} 
                        paddingAngle={5}
                        stroke="none"
                        cornerRadius={5}
                        onMouseEnter={(_, index) => setHoveredSegmentLabel(donutData[index].label)}
                        onMouseLeave={() => setHoveredSegmentLabel(null)}
                      >
                        {donutData.map((entry, i) => (
                          <Cell 
                            key={i} 
                            fill={entry.color} 
                            opacity={hoveredSegmentLabel === null || hoveredSegmentLabel === entry.label ? 1 : 0.3}
                            className="transition-opacity duration-200"
                            style={{ outline: "none" }}
                          />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none flex flex-col items-center justify-center w-full px-4">
                    <p className="text-muted-foreground text-[10px] font-medium truncate max-w-[120px] uppercase tracking-wider leading-tight">
                      {displayLabel}
                    </p>
                    <p className="text-lg font-bold text-foreground tabular-nums whitespace-nowrap">
                      R$ {displayValue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    {activeSegment && (
                      <p className="text-xs font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full mt-1">
                        {displayPercentage.toFixed(1)}%
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex-1 flex flex-col space-y-2 w-full overflow-y-auto max-h-[200px] pr-2 scrollbar-thin">
                  {donutData.map((segment) => (
                    <div
                      key={segment.label}
                      className={cn(
                        "flex items-center justify-between p-2 rounded-md transition-colors cursor-default text-sm gap-3",
                        hoveredSegmentLabel === segment.label ? "bg-muted" : "hover:bg-muted/50"
                      )}
                      onMouseEnter={() => setHoveredSegmentLabel(segment.label)}
                      onMouseLeave={() => setHoveredSegmentLabel(null)}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: segment.color }}
                        />
                        <span className="font-medium truncate text-muted-foreground" title={segment.label}>
                          {segment.label}
                        </span>
                      </div>
                      <span className="font-semibold tabular-nums shrink-0 whitespace-nowrap text-right text-foreground">
                        R$ {segment.value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm">
                <span className="opacity-50">Sem dados no período</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-6 lg:col-span-6">
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

      <Dialog open={!!selectedMemberId} onOpenChange={(open) => !open && setSelectedMemberId(null)}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden flex flex-col max-h-[85vh]">
          <DialogHeader className="px-5 pt-5 pb-4 shrink-0 border-b">
            <DialogTitle className="text-lg font-semibold text-foreground">
              Auditoria P2P
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-0.5 capitalize">
              {selectedMember?.full_name}
            </p>
          </DialogHeader>

          <div className="px-5 py-3 bg-muted/10 grid grid-cols-2 gap-4 border-b shrink-0">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Saldo Líquido</p>
              <p className={`text-lg font-semibold tabular-nums ${getBalanceStyle(selectedMember?.netBalance ?? 0).className}`}>
                R$ {(selectedMember?.netBalance ?? 0).toFixed(2)}
              </p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-muted/5 divide-y divide-border/50">
            <div className="px-5 py-4 space-y-3">
              <h3 className="text-sm font-medium text-destructive flex items-center gap-2">
                <ArrowUpRight className="h-4 w-4" />
                Dívidas com outros membros
              </h3>
              {selectedMember?.debts.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem dívidas com outros membros.</p>
              ) : (
                <div className="space-y-2">
                  {selectedMember?.debts.map((debt: any) => (
                    <div key={debt.user.id} className="flex items-center justify-between p-2 rounded-md bg-background">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={debt.user.avatar_url} />
                          <AvatarFallback>{debt.user.full_name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{debt.user.full_name}</span>
                      </div>
                      <span className="text-sm font-semibold text-destructive">
                        R$ {debt.amount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-5 py-4 space-y-3">
              <h3 className="text-sm font-medium text-success flex items-center gap-2">
                <ArrowDownLeft className="h-4 w-4" />
                Créditos com outros membros
              </h3>
              {selectedMember?.credits.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum membro te deve.</p>
              ) : (
                <div className="space-y-2">
                  {selectedMember?.credits.map((credit: any) => (
                    <div key={credit.user.id} className="flex items-center justify-between p-2 rounded-md bg-background">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={credit.user.avatar_url} />
                          <AvatarFallback>{credit.user.full_name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{credit.user.full_name}</span>
                      </div>
                      <span className="text-sm font-semibold text-success">
                        R$ {credit.amount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {isSimplifyModalOpen && (
        <DebtSimplificationModal 
          open={isSimplifyModalOpen} 
          onOpenChange={setIsSimplifyModalOpen} 
          groupId={members[0]?.group_id} 
          members={members.map(m => ({ profile: m }))}
        />
      )}
    </div>
  );
}

function QuickActionLink({
  to,
  icon: Icon,
  label,
  desc,
  state
}: {
  to: string;
  icon: LucideIcon;
  label: string;
  desc: string;
  state?: any;
}) {
  return (
    <Link
      to={to}
      state={state}
      className="flex items-start gap-3 p-4 hover:bg-muted/50 transition-colors group outline-none focus-visible:bg-muted/50"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{desc}</p>
      </div>
    </Link>
  );
}
