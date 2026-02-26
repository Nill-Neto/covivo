import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Receipt, DollarSign, Package, AlertCircle, ArrowRight, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from "recharts";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CHART_COLORS, CATEGORY_COLORS } from "@/constants/categories";
import { cn } from "@/lib/utils";

interface RepublicTabProps {
  collectiveExpenses: any[];
  totalMonthExpenses: number;
  republicChartData: any[];
  totalCollectivePending: number;
  isLate: boolean;
  onPayRateio: () => void;
}

export function RepublicTab({
  collectiveExpenses,
  totalMonthExpenses,
  republicChartData,
  totalCollectivePending,
  isLate,
  onPayRateio,
}: RepublicTabProps) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* KPI Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        
        {/* Card: Meu Rateio (Destaque Principal) */}
        <Card className={cn(
          "col-span-1 lg:col-span-2 relative overflow-hidden transition-all shadow-md hover:shadow-lg border-l-4",
          isLate && totalCollectivePending > 0 
            ? "border-l-destructive bg-destructive/5 dark:bg-destructive/10" 
            : "border-l-primary bg-white dark:bg-card"
        )}>
          <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-current opacity-5 text-foreground/10" />
          
          <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Meu Rateio (Pendente)
            </CardTitle>
            <div className={cn("p-2 rounded-full", isLate ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary")}>
              <DollarSign className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-medium text-muted-foreground translate-y-[-4px]">R$</span>
              <span className={cn("text-4xl font-serif font-bold tracking-tight", isLate ? "text-destructive" : "text-foreground")}>
                {totalCollectivePending.toFixed(2)}
              </span>
            </div>
            
            {isLate && totalCollectivePending > 0 ? (
              <div className="mt-4 flex items-center gap-2 text-sm text-destructive font-medium bg-destructive/10 px-3 py-2 rounded-md w-fit">
                <AlertCircle className="h-4 w-4" />
                <span>Pagamento em Atraso</span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mt-2">
                Referente ao ciclo atual.
              </p>
            )}

            {totalCollectivePending > 0 && (
              <Button 
                className={cn("mt-6 w-full sm:w-auto shadow-sm transition-all hover:shadow-md", isLate && "bg-destructive hover:bg-destructive/90")} 
                onClick={onPayRateio}
              >
                Realizar Pagamento
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Card: Total da Casa */}
        <Card className="col-span-1 shadow-sm hover:shadow-md transition-all border-l-4 border-l-blue-400 bg-white dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total da Casa</CardTitle>
            <div className="p-2 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
              <Receipt className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-medium text-muted-foreground translate-y-[-2px]">R$</span>
              <div className="text-3xl font-serif font-bold text-foreground">{totalMonthExpenses.toFixed(2)}</div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Soma de todas despesas coletivas</p>
          </CardContent>
        </Card>

        {/* Card: Estoque */}
        <Card className="col-span-1 shadow-sm hover:shadow-md transition-all border-l-4 border-l-amber-400 bg-white dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Estoque Crítico</CardTitle>
            <div className="p-2 rounded-full bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400">
              <Package className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-serif font-bold text-foreground">--</div>
            <Button variant="link" className="h-auto p-0 text-sm font-medium text-primary mt-2 hover:text-primary/80" asChild>
              <Link to="/inventory">Gerenciar estoque →</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-12">
        {/* Chart Section */}
        <Card className="md:col-span-4 lg:col-span-4 shadow-sm border-0 bg-white dark:bg-card overflow-hidden">
          <CardHeader className="border-b bg-muted/20 pb-4">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Distribuição de Gastos
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] relative p-6">
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
                      innerRadius={65} 
                      outerRadius={85} 
                      paddingAngle={4}
                      stroke="none"
                      cornerRadius={6}
                    >
                      {republicChartData.map((entry, i) => (
                        <Cell 
                          key={i} 
                          fill={CATEGORY_COLORS[entry.name] || CHART_COLORS[i % CHART_COLORS.length]} 
                          className="stroke-background hover:opacity-80 transition-opacity duration-300"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      formatter={(v: number) => `R$ ${v.toFixed(2)}`} 
                      contentStyle={{ 
                        borderRadius: "8px", 
                        border: "none", 
                        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                        fontSize: "12px",
                        backgroundColor: "hsl(var(--card))",
                        color: "hsl(var(--foreground))",
                        padding: "8px 12px"
                      }}
                      itemStyle={{ color: "hsl(var(--foreground))", fontWeight: 500 }}
                      cursor={false}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36} 
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ paddingTop: "20px" }}
                      formatter={(value) => <span className="text-xs font-medium text-muted-foreground ml-1">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center Label */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-[65%] text-center pointer-events-none">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">Total</span>
                  <span className="text-xl font-serif font-bold text-foreground">R$ {totalMonthExpenses.toFixed(0)}</span>
                </div>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm">
                <span className="opacity-50">Sem dados no período</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* List Section */}
        <Card className="md:col-span-8 lg:col-span-8 shadow-sm border-0 bg-white dark:bg-card flex flex-col">
          <CardHeader className="border-b bg-muted/20 pb-4 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Últimas Despesas Coletivas</CardTitle>
            <Button variant="ghost" size="sm" className="h-8 text-xs font-medium text-primary hover:text-primary/80" asChild>
              <Link to="/expenses">Ver todas <ArrowRight className="ml-1 h-3 w-3" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0 flex-1">
            <ScrollArea className="h-[300px]">
              <div className="divide-y divide-border/50">
                {collectiveExpenses.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                    <p className="text-sm">Nenhuma despesa registrada.</p>
                  </div>
                ) : (
                  collectiveExpenses.slice(0, 10).map(e => (
                    <div key={e.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors group">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-primary/5 border border-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all duration-300 shadow-sm">
                          <Receipt className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground leading-none mb-1.5">{e.title}</p>
                          <div className="flex items-center gap-2">
                             <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground bg-muted px-1.5 py-0.5 rounded-sm">
                                {e.category}
                             </span>
                             <span className="text-[10px] text-muted-foreground">
                                {format(new Date(e.purchase_date), "dd 'de' MMM", { locale: ptBR })}
                             </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                         <span className="font-serif font-bold text-foreground block">R$ {Number(e.amount).toFixed(2)}</span>
                         <span className="text-[10px] text-muted-foreground">
                           {e.payment_method === 'credit_card' ? 'Cartão de Crédito' : 'À Vista'}
                         </span>
                      </div>
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
