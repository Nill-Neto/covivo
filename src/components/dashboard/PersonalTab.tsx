import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, DollarSign, TrendingUp, Users, Wallet, Calendar, CheckCircle2, List } from "lucide-react";
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
  totalBill,
  totalUserExpenses,
  myCollectiveShare,
  personalChartData,
  myPersonalExpenses,
}: PersonalTabProps) {
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Comprometido (Mês) */}
        <Card className="sm:col-span-1 bg-primary text-primary-foreground border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-primary-foreground/90">Total Comprometido</CardTitle>
            <Wallet className="h-4 w-4 text-primary-foreground/70" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {totalUserExpenses.toFixed(2)}</div>
            <p className="text-xs text-primary-foreground/70 mt-1">Meu Rateio + Gastos (Cartão).</p>
          </CardContent>
        </Card>

        {/* Rateio Pendente */}
        <Card className={`${totalCollectivePending > 0 ? "border-destructive/30 bg-destructive/5" : ""}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className={`text-sm font-medium ${totalCollectivePending > 0 ? "text-destructive" : "text-muted-foreground"}`}>
              Rateio Pendente
            </CardTitle>
            <Users className={`h-4 w-4 ${totalCollectivePending > 0 ? "text-destructive" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalCollectivePending > 0 ? "text-destructive" : ""}`}>
              R$ {totalCollectivePending.toFixed(2)}
            </div>
            {totalCollectivePending > 0 ? (
              <p className="text-xs text-destructive mt-1 font-medium">Você deve isso ao grupo.</p>
            ) : (
              <p className="text-xs text-success mt-1 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Em dia com a casa.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Pendências Individuais (Controle Próprio) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pendências Individuais
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              R$ {totalIndividualPending.toFixed(2)}
            </div>
            
            {individualPending.length > 0 ? (
              <div className="mt-2">
                <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
                  <DialogTrigger asChild>
                    <Button variant="link" className="h-auto p-0 text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
                      <List className="h-3 w-3" /> Ver lista ({individualPending.length})
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
                    <DialogHeader className="p-6 border-b shrink-0 bg-background/95 backdrop-blur z-10">
                      <DialogTitle className="text-lg font-serif">
                        Controle Individual
                      </DialogTitle>
                      <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                        Total acumulado: 
                        <Badge variant="outline" className="font-bold text-foreground">
                          R$ {totalIndividualPending.toFixed(2)}
                        </Badge>
                      </div>
                    </DialogHeader>
                    
                    <div className="h-[60vh] max-h-[500px] w-full bg-muted/5">
                      <ScrollArea className="h-full w-full">
                        <div className="divide-y p-0">
                          {individualPending.map((item) => (
                            <div key={item.id} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors bg-card">
                              <div className="min-w-0 pr-4">
                                <p className="text-sm font-medium truncate">{item.expenses?.title}</p>
                                <div className="flex items-center gap-2 mt-1.5">
                                  <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-normal bg-muted text-muted-foreground border-0">
                                    {getCategoryLabel(item.expenses?.category)}
                                  </Badge>
                                  <span className="text-[10px] text-muted-foreground">
                                    {item.expenses?.purchase_date ? format(new Date(item.expenses.purchase_date), "dd/MM/yyyy") : "Data n/d"}
                                  </span>
                                </div>
                              </div>
                              <span className="font-bold text-sm tabular-nums whitespace-nowrap">
                                R$ {Number(item.amount).toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                    
                    <div className="p-3 bg-muted/20 border-t text-center shrink-0">
                      <p className="text-[10px] text-muted-foreground">
                        Despesas pessoais (controle próprio, não envolve o grupo).
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Gastos à Vista</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {totalPersonalCash.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">Dinheiro, Pix ou Débito.</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-12">
        <Card className="md:col-span-8 lg:col-span-8">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Histórico Recente (Pessoal)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-4">
                {myPersonalExpenses.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-10 text-muted-foreground">
                    <p className="text-sm">Nenhuma despesa pessoal este mês.</p>
                  </div>
                ) : (
                  myPersonalExpenses.slice(0, 15).map(e => (
                    <div key={e.id} className="flex items-center justify-between border-b border-border/40 pb-3 last:border-0 last:pb-0 hover:bg-muted/30 p-2 rounded-md transition-colors">
                      <div className="flex flex-col gap-1">
                        <p className="text-sm font-medium">{e.title}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-normal bg-muted text-muted-foreground border-0">
                            {getCategoryLabel(e.category)}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">
                            {format(new Date(e.purchase_date), "dd/MM")} • {e.payment_method === 'credit_card' ? 'Cartão' : 'À vista'}
                          </span>
                        </div>
                      </div>
                      <span className="font-semibold text-sm">R$ {Number(e.amount).toFixed(2)}</span>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="md:col-span-4 lg:col-span-4 flex flex-col">
          <CardHeader>
            <CardTitle className="text-base">Categorias (Pessoal)</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-[300px]">
            {personalChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={personalChartData} 
                  margin={{ left: 0, right: 0, top: 10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 10, fill: "#64748b" }} 
                    axisLine={false} 
                    tickLine={false} 
                    interval={0}
                  />
                  <YAxis hide />
                  <RechartsTooltip 
                    cursor={{fill: 'transparent'}} 
                    formatter={(v: number) => [`R$ ${v.toFixed(2)}`, 'Valor']}
                    contentStyle={{ 
                      borderRadius: "8px", 
                      border: "1px solid #e2e8f0", 
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                      fontSize: "12px"
                    }} 
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={32}>
                     {personalChartData.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.name] || CHART_COLORS[index % CHART_COLORS.length]} />
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