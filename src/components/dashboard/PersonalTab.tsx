import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, DollarSign, Users, Wallet, CheckCircle2, List, Receipt, ArrowRight } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from "recharts";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { parseLocalDate } from "@/lib/utils";
import { ptBR } from "date-fns/locale";
import { CHART_COLORS, CATEGORY_COLORS, getCategoryLabel } from "@/constants/categories";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface PersonalTabProps {
  totalIndividualPending: number;
  totalCollectivePendingPrevious: number;
  totalCollectivePendingCurrent: number;
  collectivePendingPreviousByCompetence: {
    competence: string;
    total: number;
    items: any[];
  }[];
  collectivePendingCurrent: any[];
  individualPending: any[];
  totalPersonalCash: number;
  totalBill: number;
  totalUserExpenses: number;
  myCollectiveShare: number;
  personalChartData: any[];
  myPersonalExpenses: any[];
  collectiveExpenses: any[];
  totalMonthExpenses: number;
  republicChartData: any[];
  onPayRateio: (scope: "previous" | "current") => void;
}

export function PersonalTab({
  totalIndividualPending,
  totalCollectivePendingPrevious,
  totalCollectivePendingCurrent,
  collectivePendingPreviousByCompetence,
  collectivePendingCurrent,
  individualPending,
  totalPersonalCash,
  totalBill,
  totalUserExpenses,
  myCollectiveShare,
  personalChartData,
  myPersonalExpenses,
  collectiveExpenses,
  totalMonthExpenses,
  republicChartData,
  onPayRateio,
}: PersonalTabProps) {
  const totalSpentCompetence = totalUserExpenses + totalPersonalCash;

  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isPreviousCollectiveOpen, setIsPreviousCollectiveOpen] = useState(false);
  const [isCurrentCollectiveOpen, setIsCurrentCollectiveOpen] = useState(false);
  const [isCashDetailOpen, setIsCashDetailOpen] = useState(false);

  const cashExpenses = myPersonalExpenses
    .filter((e: any) => e.payment_method !== 'credit_card')
    .sort((a: any, b: any) => (b.purchase_date || "").localeCompare(a.purchase_date || ""));
  const totalPersonalExpensesSum = myPersonalExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {/* Total Comprometido (Mês) - DESTAQUE PREMIUM */}
        <Card className="relative overflow-hidden border-0 sm:col-span-2 lg:col-span-1 flex flex-col justify-between bg-primary shadow-xl shadow-primary/20 min-h-[220px]">
          {/* Premium Background Effects */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent mix-blend-overlay pointer-events-none" />
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-black/10 blur-3xl pointer-events-none" />
          
          {/* Watermark Icon to fill empty space */}
          <Wallet className="absolute -bottom-6 -right-6 w-48 h-48 text-black/5 pointer-events-none transform -rotate-12" />
          
          <CardHeader className="relative z-10 pb-0 pt-6 px-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs sm:text-sm font-bold text-white/90 uppercase tracking-widest drop-shadow-sm">
                Total Comprometido
              </CardTitle>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-md shadow-inner border border-white/20">
                <Wallet className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="relative z-10 pt-8 pb-6 px-6 flex flex-col gap-3 mt-auto">
            <div className="text-4xl lg:text-5xl font-bold tracking-tight text-white drop-shadow-sm">
              R$ {totalUserExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="flex items-center">
              <span className="text-xs font-medium bg-black/20 text-white px-3 py-1.5 rounded-full backdrop-blur-md border border-white/10">
                Meu Rateio + Gastos Pessoais
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Rateio pendente (competências anteriores) */}
        <Card className={`border-l-4 ${totalCollectivePendingPrevious > 0.01 ? "border-l-destructive" : "border-l-success"} bg-card shadow-sm`}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Rateio Pendente (Anteriores)
            </CardTitle>
            <div className={`flex h-8 w-8 items-center justify-center rounded-full ${totalCollectivePendingPrevious > 0.01 ? "bg-destructive/10" : "bg-success/10"}`}>
              <Users className={`h-4 w-4 ${totalCollectivePendingPrevious > 0.01 ? "text-destructive" : "text-success"}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalCollectivePendingPrevious > 0.01 ? "text-destructive" : "text-foreground"}`}>
              R$ {totalCollectivePendingPrevious.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            {totalCollectivePendingPrevious > 0.01 ? (
              <p className="text-xs text-muted-foreground mt-1">Apenas competências anteriores.</p>
            ) : (
              <p className="text-xs text-success mt-1 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Sem pendências anteriores.
              </p>
            )}
            
            <div className="mt-3 flex flex-wrap gap-2">
              {totalCollectivePendingPrevious > 0.01 && (
                <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => onPayRateio("previous")}>
                  Pagar competências anteriores
                </Button>
              )}
              {totalCollectivePendingPrevious > 0.01 && collectivePendingPreviousByCompetence.length > 0 && (
                <Dialog open={isPreviousCollectiveOpen} onOpenChange={setIsPreviousCollectiveOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5">
                      <List className="h-3 w-3" /> Ver itens ({collectivePendingPreviousByCompetence.reduce((s, g) => s + g.items.length, 0)})
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden flex flex-col max-h-[85vh]">
                    <DialogHeader className="px-5 pt-5 pb-4 shrink-0">
                      <DialogTitle className="text-lg font-semibold text-foreground">
                        Rateio Pendente
                      </DialogTitle>
                      <p className="text-sm text-muted-foreground mt-0.5">Competências anteriores ao ciclo vigente</p>
                    </DialogHeader>

                    <div className="mx-5 mb-4 rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">Total pendente</span>
                      <span className="text-lg font-bold text-destructive tabular-nums">
                        R$ {totalCollectivePendingPrevious.toFixed(2)}
                      </span>
                    </div>

                    <div className="border-t">
                      <div className="overflow-y-auto max-h-[50vh]">
                        <div className="divide-y">
                          {collectivePendingPreviousByCompetence.map((group) => (
                            <div key={group.competence} className="px-5 py-4 space-y-2.5">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-semibold text-foreground">
                                  Competência {group.competence}
                                </p>
                                <Badge variant="secondary" className="font-semibold text-xs">
                                  R$ {group.total.toFixed(2)}
                                </Badge>
                              </div>

                              <div className="space-y-1.5">
                                {group.items.map((item) => (
                                  <div key={item.id} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2.5">
                                    <div className="min-w-0 pr-4">
                                      <div className="flex items-center gap-2 mb-1">
                                        <p className="text-sm font-medium truncate text-foreground">
                                          {item.expenses?.title || "Despesa sem título"}
                                          {item.originalAmount && item.originalAmount > item.amount && (
                                            <span className="ml-2 font-normal text-[10px] text-muted-foreground">
                                              (Parcial - Orig: R$ {Number(item.originalAmount).toFixed(2)})
                                            </span>
                                          )}
                                        </p>
                                        {item.expenses?.installments > 1 && (
                                          <Badge variant="secondary" className="text-[10px] font-medium px-1.5 py-0.5 leading-none shrink-0">
                                            Parc. {item.installment_number || 1}/{item.expenses.installments}
                                          </Badge>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-normal">
                                          {getCategoryLabel(item.expenses?.category)}
                                        </Badge>
                                        <span className="text-xs text-muted-foreground">
                                          {item.expenses?.purchase_date ? format(parseLocalDate(item.expenses.purchase_date), "dd/MM/yyyy") : "Data n/d"}
                                        </span>
                                      </div>
                                    </div>
                                    <span className="text-sm font-semibold tabular-nums whitespace-nowrap text-foreground">
                                      R$ {Number(item.amount).toFixed(2)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Rateio em aberto (competência atual) */}
        <Card className={`border-l-4 ${totalCollectivePendingCurrent > 0.01 ? "border-l-warning" : "border-l-muted"} bg-card shadow-sm`}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Rateio em Aberto (Atual)
            </CardTitle>
            <div className={`flex h-8 w-8 items-center justify-center rounded-full ${totalCollectivePendingCurrent > 0.01 ? "bg-warning/10" : "bg-muted"}`}>
              <Users className={`h-4 w-4 ${totalCollectivePendingCurrent > 0.01 ? "text-warning" : "text-muted-foreground"}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalCollectivePendingCurrent > 0.01 ? "text-warning" : "text-foreground"}`}>
              R$ {totalCollectivePendingCurrent.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Somente itens da competência vigente.</p>
            
            <div className="mt-3 flex flex-wrap gap-2">
              {totalCollectivePendingCurrent > 0.01 && (
                <Button size="sm" variant="default" className="h-7 text-xs" onClick={() => onPayRateio("current")}>
                  Pagar competência atual
                </Button>
              )}
              {totalCollectivePendingCurrent > 0.01 && collectivePendingCurrent.length > 0 && (
                <Dialog open={isCurrentCollectiveOpen} onOpenChange={setIsCurrentCollectiveOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5">
                      <List className="h-3 w-3" /> Ver itens ({collectivePendingCurrent.length})
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden flex flex-col max-h-[85vh]">
                    <DialogHeader className="px-5 pt-5 pb-4 shrink-0">
                      <DialogTitle className="text-lg font-semibold text-foreground">
                        Rateio em Aberto
                      </DialogTitle>
                      <p className="text-sm text-muted-foreground mt-0.5">Competência vigente</p>
                    </DialogHeader>

                    <div className="mx-5 mb-4 rounded-lg bg-warning/10 border border-warning/20 px-4 py-3 flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">Total em aberto</span>
                      <span className="text-lg font-bold text-warning tabular-nums">
                        R$ {totalCollectivePendingCurrent.toFixed(2)}
                      </span>
                    </div>

                    <div className="border-t">
                      <div className="overflow-y-auto max-h-[50vh]">
                        <div className="divide-y">
                          {collectivePendingCurrent.map((item) => (
                            <div key={item.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-muted/30 transition-colors">
                              <div className="min-w-0 pr-4">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="text-sm font-medium truncate text-foreground">
                                    {item.expenses?.title || "Despesa sem título"}
                                    {item.originalAmount && item.originalAmount > item.amount && (
                                      <span className="ml-2 font-normal text-[10px] text-muted-foreground">
                                        (Parcial - Orig: R$ {Number(item.originalAmount).toFixed(2)})
                                      </span>
                                    )}
                                  </p>
                                  {item.expenses?.installments > 1 && (
                                    <Badge variant="secondary" className="text-[10px] font-medium px-1.5 py-0.5 leading-none shrink-0">
                                      Parc. {item.installment_number || 1}/{item.expenses.installments}
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-normal">
                                    {getCategoryLabel(item.expenses?.category)}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {item.expenses?.purchase_date ? format(parseLocalDate(item.expenses.purchase_date), "dd/MM/yyyy") : "Data n/d"}
                                  </span>
                                </div>
                              </div>
                              <span className="font-semibold text-sm tabular-nums whitespace-nowrap text-foreground">
                                R$ {Number(item.amount).toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pendências Individuais */}
        <Card className="border-l-4 border-l-muted bg-card shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pendências Individuais
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              R$ {totalIndividualPending.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            
            {individualPending.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5">
                      <List className="h-3 w-3" /> Ver itens ({individualPending.length})
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden flex flex-col max-h-[85vh]">
                    <DialogHeader className="px-5 pt-5 pb-4 shrink-0">
                      <DialogTitle className="text-lg font-semibold text-foreground">
                        Controle Individual
                      </DialogTitle>
                      <p className="text-sm text-muted-foreground mt-0.5">Despesas pessoais de acompanhamento próprio</p>
                    </DialogHeader>

                    <div className="mx-5 mb-4 rounded-lg bg-muted/60 border border-border px-4 py-3 flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">Total pendente</span>
                      <span className="text-lg font-bold text-foreground tabular-nums">
                        R$ {totalIndividualPending.toFixed(2)}
                      </span>
                    </div>
                    
                    <div className="border-t">
                      <div className="overflow-y-auto max-h-[50vh]">
                        <div className="divide-y">
                          {individualPending.map((item) => (
                            <div key={item.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-muted/30 transition-colors">
                              <div className="min-w-0 pr-4">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="text-sm font-medium truncate text-foreground">{item.expenses?.title}</p>
                                  {item.expenses?.installments > 1 && (
                                    <Badge variant="secondary" className="text-[10px] font-medium px-1.5 py-0.5 leading-none shrink-0">
                                      Parc. {item.installment_number || 1}/{item.expenses.installments}
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-normal">
                                    {getCategoryLabel(item.expenses?.category)}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {item.expenses?.purchase_date ? format(parseLocalDate(item.expenses.purchase_date), "dd/MM/yyyy") : "Data n/d"}
                                  </span>
                                </div>
                              </div>
                              <span className="font-semibold text-sm tabular-nums whitespace-nowrap text-foreground">
                                R$ {Number(item.amount).toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <div className="px-5 py-3 bg-muted/30 border-t text-center shrink-0">
                      <p className="text-xs text-muted-foreground">
                        Controle próprio — não envolve o grupo.
                      </p>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">Nenhum controle pendente.</p>
            )}
          </CardContent>
        </Card>

        {/* Gastos à Vista */}
        <Card className="border-l-4 border-l-secondary bg-card shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Gastos à Vista</CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary">
              <DollarSign className="h-4 w-4 text-secondary-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {totalPersonalCash.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Dinheiro, Pix ou Débito.</p>
            {cashExpenses.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                <Dialog open={isCashDetailOpen} onOpenChange={setIsCashDetailOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5">
                      <List className="h-3 w-3" /> Ver itens ({cashExpenses.length})
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden flex flex-col max-h-[85vh]">
                    <DialogHeader className="px-5 pt-5 pb-4 shrink-0">
                      <DialogTitle className="text-lg font-semibold text-foreground">
                        Gastos à Vista
                      </DialogTitle>
                      <p className="text-sm text-muted-foreground mt-0.5">Dinheiro, Pix e Débito</p>
                    </DialogHeader>

                    <div className="mx-5 mb-4 rounded-lg bg-secondary/50 border border-border px-4 py-3 flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">Total</span>
                      <span className="text-lg font-bold text-foreground tabular-nums">
                        R$ {totalPersonalCash.toFixed(2)}
                      </span>
                    </div>

                    <div className="border-t">
                      <div className="overflow-y-auto max-h-[50vh]">
                        <div className="divide-y">
                          {cashExpenses.map((e: any) => {
                            const methodMap: Record<string, string> = { cash: "Dinheiro", pix: "Pix", debit: "Débito" };
                            return (
                              <div key={e.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-muted/30 transition-colors">
                                <div className="min-w-0 pr-4">
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className="text-sm font-medium truncate text-foreground">{e.title}</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-normal">
                                      {getCategoryLabel(e.category)}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                      {e.purchase_date ? format(parseLocalDate(e.purchase_date), "dd/MM/yyyy") : ""} · {methodMap[e.payment_method] || e.payment_method}
                                    </span>
                                  </div>
                                </div>
                                <span className="font-semibold text-sm tabular-nums whitespace-nowrap text-foreground">
                                  R$ {Number(e.amount).toFixed(2)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Total Gasto na Competência */}
        <Card className="border-l-4 border-l-success bg-card shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Gasto (Competência)</CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success/10">
              <Receipt className="h-4 w-4 text-success" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              R$ {totalSpentCompetence.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Comprometido + À Vista.</p>
          </CardContent>
        </Card>
      </div>

      {/* --- GRÁFICOS E LISTAS INDIVIDUAIS --- */}
      <div className="grid gap-4 md:grid-cols-12">
        {/* Chart Individual */}
        <Card className="md:col-span-4 lg:col-span-4">
          <CardHeader>
            <CardTitle className="text-base">Distribuição Individual</CardTitle>
          </CardHeader>
          <CardContent className="h-[250px] relative">
            {personalChartData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie 
                      data={personalChartData} 
                      dataKey="value" 
                      nameKey="name" 
                      cx="50%" 
                      cy="50%" 
                      innerRadius={60} 
                      outerRadius={80} 
                      paddingAngle={5}
                      stroke="none"
                      cornerRadius={5}
                    >
                      {personalChartData.map((entry, i) => (
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
                  <span className="text-xs text-muted-foreground block">Total</span>
                  <span className="text-lg font-bold">R$ {totalPersonalExpensesSum.toFixed(0)}</span>
                </div>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm">
                <span className="opacity-50">Sem dados no período</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* List Individual */}
        <Card className="md:col-span-8 lg:col-span-8">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="h-4 w-4" /> Últimas Despesas Individuais
            </CardTitle>
            <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
              <Link to="/expenses">Ver todas</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[250px] pr-2 px-2">
              <div className="space-y-1">
                {myPersonalExpenses.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Nenhuma despesa individual registrada.</p>
                ) : (
                  [...myPersonalExpenses]
                    .sort((a, b) => parseLocalDate(b.purchase_date).getTime() - parseLocalDate(a.purchase_date).getTime())
                    .slice(0, 10)
                    .map(expense => (
                    <div key={expense.id} className="flex items-center justify-between py-2.5 px-3 group hover:bg-muted/50 rounded-md transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                          <Receipt className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-medium leading-none truncate max-w-[120px] sm:max-w-[200px]">{expense.title}</p>
                            {expense.installments > 1 && (
                              <Badge variant="secondary" className="text-[10px] font-medium px-1.5 py-0.5 leading-none shrink-0">
                                Parc. {expense.installment_number || 1}/{expense.installments}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
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

      {/* --- GRÁFICOS E LISTAS COLETIVAS --- */}
      <div className="grid gap-4 md:grid-cols-12">
        {/* Chart Coletivo */}
        <Card className="md:col-span-4 lg:col-span-4">
          <CardHeader>
            <CardTitle className="text-base">Distribuição Coletiva</CardTitle>
          </CardHeader>
          <CardContent className="h-[250px] relative">
            {republicChartData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie 
                      data={republicChartData} 
                      dataKey="value" 
                      nameKey="name" 
                      cx="50%" 
                      cy="50%" 
                      innerRadius={60} 
                      outerRadius={80} 
                      paddingAngle={5}
                      stroke="none"
                      cornerRadius={5}
                    >
                      {republicChartData.map((entry, i) => (
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
                  <span className="text-xs text-muted-foreground block">Total Casa</span>
                  <span className="text-lg font-bold">R$ {totalMonthExpenses.toFixed(0)}</span>
                </div>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm">
                <span className="opacity-50">Sem dados no período</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* List Coletivo */}
        <Card className="md:col-span-8 lg:col-span-8">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="h-4 w-4" /> Últimas Despesas Coletivas
            </CardTitle>
            <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
              <Link to="/expenses">Ver todas</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[250px] pr-2 px-2">
              <div className="space-y-1">
                {collectiveExpenses.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Nenhuma despesa coletiva registrada.</p>
                ) : (
                  [...collectiveExpenses]
                    .sort((a, b) => parseLocalDate(b.purchase_date).getTime() - parseLocalDate(a.purchase_date).getTime())
                    .slice(0, 10)
                    .map(expense => (
                    <div key={expense.id} className="flex items-center justify-between py-2.5 px-3 group hover:bg-muted/50 rounded-md transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                          <Receipt className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-medium leading-none truncate max-w-[120px] sm:max-w-[200px]">{expense.title}</p>
                            {expense.installments > 1 && (
                              <Badge variant="secondary" className="text-[10px] font-medium px-1.5 py-0.5 leading-none shrink-0">
                                Parc. 1/{expense.installments}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
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
  );
}