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
        
        {/* Card: Meu Rateio */}
        <Card className={cn(
          "col-span-1 lg:col-span-2 relative overflow-hidden transition-all shadow-sm border-l-4",
          isLate && totalCollectivePending > 0 
            ? "border-l-destructive bg-destructive/5" 
            : "border-l-primary bg-card"
        )}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Meu Rateio (Pendente)
            </CardTitle>
            <DollarSign className={cn("h-4 w-4", isLate ? "text-destructive" : "text-primary")} />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-medium text-muted-foreground">R$</span>
              <span className={cn("text-3xl font-bold tracking-tight", isLate ? "text-destructive" : "text-foreground")}>
                {totalCollectivePending.toFixed(2)}
              </span>
            </div>
            
            {isLate && totalCollectivePending > 0 ? (
              <div className="mt-4 flex items-center gap-2 text-sm text-destructive font-medium bg-destructive/10 px-3 py-2 rounded-md w-fit">
                <AlertCircle className="h-4 w-4" />
                <span>Pagamento em Atraso</span>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground mt-2">
                Referente ao ciclo atual.
              </p>
            )}

            {totalCollectivePending > 0 && (
              <Button 
                className={cn("mt-4 w-full sm:w-auto shadow-sm", isLate && "bg-destructive hover:bg-destructive/90")} 
                onClick={onPayRateio}
              >
                Realizar Pagamento
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Card: Total da Casa */}
        <Card className="col-span-1 shadow-sm border-l-4 border-l-blue-400 bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total da Casa</CardTitle>
            <Receipt className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-medium text-muted-foreground">R$</span>
              <div className="text-2xl font-bold text-foreground">{totalMonthExpenses.toFixed(2)}</div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Soma de todas despesas coletivas</p>
          </CardContent>
        </Card>

        {/* Card: Estoque */}
        <Card className="col-span-1 shadow-sm border-l-4 border-l-amber-400 bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Estoque Crítico</CardTitle>
            <Package className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">--</div>
            <Button variant="link" className="h-auto p-0 text-xs font-medium text-primary mt-2" asChild>
              <Link to="/inventory">Gerenciar estoque →</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-12">
        {/* Chart Section */}
        <Card className="md:col-span-4 lg:col-span-4 shadow-sm border bg-card">
          <CardHeader className="border-b bg-muted/30 pb-3">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Distribuição
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[250px] relative p-4">
            {republicChartData.length > 0 ? (
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
                    paddingAngle={2}
                    stroke="none"
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
                      border: "1px solid var(--border)", 
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      fontSize: "12px",
                      backgroundColor: "var(--card)",
                      color: "var(--foreground)"
                    }}
                    itemStyle={{ color: "var(--foreground)" }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    iconType="circle"
                    iconSize={8}
                    formatter={(value) => <span className="text-xs text-muted-foreground ml-1">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm">
                <span className="opacity-50">Sem dados no período</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* List Section */}
        <Card className="md:col-span-8 lg:col-span-8 shadow-sm border bg-card flex flex-col">
          <CardHeader className="border-b bg-muted/30 pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Últimas Despesas</CardTitle>
            <Button variant="ghost" size="sm" className="h-7 text-xs font-medium text-primary hover:text-primary/80" asChild>
              <Link to="/expenses">Ver todas <ArrowRight className="ml-1 h-3 w-3" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0 flex-1">
            <ScrollArea className="h-[250px]">
              <div className="divide-y divide-border">
                {collectiveExpenses.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                    <p className="text-sm">Nenhuma despesa registrada.</p>
                  </div>
                ) : (
                  collectiveExpenses.slice(0, 10).map(e => (
                    <div key={e.id} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors group">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                          <Receipt className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground leading-none mb-1">{e.title}</p>
                          <div className="flex items-center gap-2">
                             <Badge variant="outline" className="text-[10px] font-normal h-5 border-border text-muted-foreground px-1.5">
                                {e.category}
                             </Badge>
                             <span className="text-[10px] text-muted-foreground">
                                {format(new Date(e.purchase_date), "dd/MM", { locale: ptBR })}
                             </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                         <span className="font-bold text-sm text-foreground block">R$ {Number(e.amount).toFixed(2)}</span>
                         <span className="text-[10px] text-muted-foreground">
                           {e.payment_method === 'credit_card' ? 'Cartão' : 'À Vista'}
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
