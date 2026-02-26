import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, DollarSign, TrendingUp, Users, Wallet, CheckCircle2, List } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, CartesianGrid } from "recharts";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
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
import { cn } from "@/lib/utils";

interface PersonalTabProps {
  totalIndividualPending: number;
  totalCollectivePending: number;
  individualPending: any[];
  totalPersonalCash: number;
  totalBill: number;
  totalUserExpenses: number;
  myCollectiveShare: number;
  personalChartData: any[];
  myPersonalExpenses: any[];
}

export function PersonalTab({
  totalIndividualPending,
  totalCollectivePending,
  individualPending,
  totalPersonalCash,
  totalUserExpenses,
  myCollectiveShare,
  personalChartData,
  myPersonalExpenses,
}: PersonalTabProps) {
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* KPI Cards Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        
        {/* Total Comprometido */}
        <Card className="sm:col-span-1 border-l-4 border-l-primary shadow-sm bg-card transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Comprometido</CardTitle>
            <Wallet className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-1">
               <span className="text-sm font-medium text-muted-foreground">R$</span>
               <div className="text-3xl font-bold tracking-tight text-foreground">{totalUserExpenses.toFixed(2)}</div>
            </div>
            <p className="text-[11px] font-medium text-muted-foreground mt-2 uppercase tracking-wide">
              Rateio + Gastos Pessoais
            </p>
          </CardContent>
        </Card>

        {/* Rateio Pendente */}
        <Card className={cn(
          "bg-card shadow-sm border-l-4 transition-all",
          totalCollectivePending > 0 ? "border-l-destructive" : "border-l-emerald-500"
        )}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Rateio Pendente
            </CardTitle>
            <Users className={cn("h-4 w-4", totalCollectivePending > 0 ? "text-destructive" : "text-emerald-500")} />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-1">
               <span className="text-sm font-medium text-muted-foreground">R$</span>
               <div className={cn("text-3xl font-bold", totalCollectivePending > 0 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400")}>
                  {totalCollectivePending.toFixed(2)}
               </div>
            </div>
            
            {totalCollectivePending > 0 ? (
              <p className="text-xs text-destructive font-medium mt-2 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> Pendente com o grupo
              </p>
            ) : (
              <p className="text-xs text-emerald-600 font-medium mt-2 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Tudo pago!
              </p>
            )}
          </CardContent>
        </Card>

        {/* Pendências Individuais */}
        <Card className="bg-card shadow-sm border-l-4 border-l-amber-400 transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Pendências Individuais
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-1">
               <span className="text-sm font-medium text-muted-foreground">R$</span>
               <div className="text-3xl font-bold text-foreground">
                  {totalIndividualPending.toFixed(2)}
               </div>
            </div>
            
            {individualPending.length > 0 ? (
              <div className="mt-2">
                <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" className="h-auto p-0 text-xs font-medium text-primary hover:text-primary/80 hover:bg-transparent flex items-center gap-1">
                      Ver {individualPending.length} pendências <List className="h-3 w-3 ml-1" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden flex flex-col max-h-[80vh]">
                    <DialogHeader className="p-4 border-b shrink-0 bg-muted/30">
                      <DialogTitle className="text-base font-semibold flex items-center justify-between w-full">
                        <span>Controle Individual</span>
                        <Badge variant="outline" className="font-mono text-sm bg-background">
                          R$ {totalIndividualPending.toFixed(2)}
                        </Badge>
                      </DialogTitle>
                    </DialogHeader>
                    
                    <div className="flex-1 overflow-hidden bg-card">
                      <ScrollArea className="h-full">
                        <div className="divide-y divide-border/50">
                          {individualPending.map((item) => (
                            <div key={item.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                              <div className="min-w-0 pr-4">
                                <p className="text-sm font-semibold text-foreground truncate">{item.expenses?.title}</p>
                                <div className="flex items-center gap-2 mt-1.5">
                                  <Badge variant="outline" className="text-[10px] px-1.5 h-5 font-normal rounded-sm border-border text-muted-foreground">
                                    {getCategoryLabel(item.expenses?.category)}
                                  </Badge>
                                  <span className="text-[10px] text-muted-foreground">
                                    {item.expenses?.purchase_date ? format(new Date(item.expenses.purchase_date), "dd/MM") : "Data n/d"}
                                  </span>
                                </div>
                              </div>
                              <span className="font-bold text-sm text-foreground whitespace-nowrap">
                                R$ {Number(item.amount).toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground mt-2">Nenhum controle pendente.</p>
            )}
          </CardContent>
        </Card>

        {/* Gastos à Vista */}
        <Card className="bg-card shadow-sm border-l-4 border-l-slate-400 transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Gastos à Vista</CardTitle>
            <DollarSign className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-1">
               <span className="text-sm font-medium text-muted-foreground">R$</span>
               <div className="text-3xl font-bold text-foreground">
                  {totalPersonalCash.toFixed(2)}
               </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Dinheiro, Pix ou Débito.</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-12">
        {/* Recent History List */}
        <Card className="md:col-span-8 lg:col-span-8 shadow-sm border bg-card flex flex-col">
          <CardHeader className="border-b bg-muted/30 pb-3">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Histórico Recente
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1">
            <ScrollArea className="h-[250px]">
              <div className="divide-y divide-border">
                {myPersonalExpenses.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                    <p className="text-sm">Nenhuma despesa pessoal este mês.</p>
                  </div>
                ) : (
                  myPersonalExpenses.slice(0, 15).map(e => (
                    <div key={e.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors group">
                      <div className="flex items-center gap-3">
                         <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
                           {e.payment_method === 'credit_card' ? <Wallet className="h-4 w-4" /> : <DollarSign className="h-4 w-4" />}
                         </div>
                         <div>
                            <p className="text-sm font-semibold text-foreground mb-1">{e.title}</p>
                            <div className="flex items-center gap-2">
                               <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-normal border-border text-muted-foreground rounded-sm">
                                  {getCategoryLabel(e.category)}
                               </Badge>
                               <span className="text-[10px] text-muted-foreground">
                                  {format(new Date(e.purchase_date), "dd/MM")} • {e.payment_method === 'credit_card' ? 'Cartão' : 'À vista'}
                               </span>
                            </div>
                         </div>
                      </div>
                      <span className="font-bold text-sm text-foreground">
                         R$ {Number(e.amount).toFixed(2)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Chart Section */}
        <Card className="md:col-span-4 lg:col-span-4 shadow-sm border bg-card flex flex-col">
          <CardHeader className="border-b bg-muted/30 pb-3">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Categorias
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-[250px] p-4">
            {personalChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={personalChartData} 
                  margin={{ left: 0, right: 0, top: 10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.4} />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} 
                    axisLine={false} 
                    tickLine={false} 
                    interval={0}
                    dy={10}
                  />
                  <YAxis hide />
                  <RechartsTooltip 
                    cursor={{fill: 'var(--muted)', opacity: 0.3}} 
                    formatter={(v: number) => [`R$ ${v.toFixed(2)}`, 'Valor']}
                    contentStyle={{ 
                      borderRadius: "8px", 
                      border: "1px solid var(--border)", 
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      fontSize: "12px",
                      backgroundColor: "var(--card)",
                      color: "var(--foreground)"
                    }}
                    labelStyle={{ color: "var(--muted-foreground)", marginBottom: "4px" }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={28}>
                     {personalChartData.map((entry, index) => (
                       <Cell 
                          key={`cell-${index}`} 
                          fill={CATEGORY_COLORS[entry.name] || CHART_COLORS[index % CHART_COLORS.length]} 
                       />
                     ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm">
                <span className="opacity-50">Sem dados para exibir</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
