import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, DollarSign, TrendingUp, Users, Wallet, Calendar, CheckCircle2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, CartesianGrid } from "recharts";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CHART_COLORS, CATEGORY_COLORS } from "@/constants/categories";
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
  individualPending: any[];
  totalPersonalCash: number;
  totalBill: number;
  totalUserExpenses: number;
  myCollectiveShare: number;
  personalChartData: any[];
  myPersonalExpenses: any[];
  onPayIndividual?: (split?: any) => void;
}

export function PersonalTab({
  totalIndividualPending,
  individualPending,
  totalPersonalCash,
  totalBill,
  totalUserExpenses,
  myCollectiveShare,
  personalChartData,
  myPersonalExpenses,
  onPayIndividual,
}: PersonalTabProps) {
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Cards de Resumo */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="sm:col-span-2 bg-primary text-primary-foreground border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-primary-foreground/90">Total Comprometido (Mês)</CardTitle>
            <Wallet className="h-4 w-4 text-primary-foreground/70" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">R$ {totalUserExpenses.toFixed(2)}</div>
            <p className="text-xs text-primary-foreground/70 mt-1">Soma de Rateio + Gastos Individuais (Cartão).</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Meu Rateio da Casa</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {myCollectiveShare.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">Sua parte nas despesas coletivas.</p>
          </CardContent>
        </Card>

        {/* Card de Pendências Individuais Melhorado */}
        <Card className={`relative transition-all duration-300 ${totalIndividualPending > 0 ? "border-destructive/50 bg-destructive/5 ring-1 ring-destructive/20" : ""}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className={`text-sm font-medium ${totalIndividualPending > 0 ? "text-destructive" : "text-muted-foreground"}`}>
              Pendências Individuais
            </CardTitle>
            <AlertCircle className={`h-4 w-4 ${totalIndividualPending > 0 ? "text-destructive" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalIndividualPending > 0 ? "text-destructive" : ""}`}>
              R$ {totalIndividualPending.toFixed(2)}
            </div>
            {individualPending.length > 0 ? (
              <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
                <DialogTrigger asChild>
                  <Button variant="link" className="h-auto p-0 text-xs font-bold text-destructive hover:text-destructive/80 mt-2 flex items-center gap-1">
                    {individualPending.length} {individualPending.length === 1 ? 'despesa aguarda' : 'despesas aguardam'} pagamento →
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md gap-0 p-0 overflow-hidden">
                  <DialogHeader className="p-6 pb-4 border-b">
                    <DialogTitle className="flex items-center gap-2 text-destructive">
                      <AlertCircle className="h-5 w-5" />
                      Pendências Individuais
                    </DialogTitle>
                  </DialogHeader>
                  
                  <div className="p-4 bg-muted/30 border-b">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-muted-foreground">Total a Regularizar</span>
                      <span className="text-xl font-bold text-destructive">R$ {totalIndividualPending.toFixed(2)}</span>
                    </div>
                  </div>
                  
                  <ScrollArea className="max-h-[400px]">
                    <div className="p-4 space-y-3">
                      {individualPending.map((item) => (
                        <div key={item.id} className="flex flex-col gap-3 p-3 border rounded-xl bg-card hover:bg-muted/20 transition-colors shadow-sm">
                          <div className="flex justify-between items-start">
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-sm truncate pr-2">{item.expenses?.title}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Calendar className="h-3 w-3 text-muted-foreground" />
                                <span className="text-[11px] text-muted-foreground">
                                  {item.expenses?.purchase_date ? format(new Date(item.expenses.purchase_date), "dd 'de' MMM", { locale: ptBR }) : "Sem data"}
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-base text-foreground">R$ {Number(item.amount).toFixed(2)}</p>
                            </div>
                          </div>
                          
                          {onPayIndividual && (
                            <Button 
                              size="sm"
                              variant="outline"
                              className="w-full h-8 text-xs font-bold border-destructive/20 text-destructive hover:bg-destructive hover:text-white" 
                              onClick={() => {
                                setIsDetailOpen(false);
                                onPayIndividual(item);
                              }}
                            >
                              Anexar Comprovante
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  
                  <div className="p-4 border-t bg-muted/10">
                    <p className="text-[10px] text-center text-muted-foreground uppercase tracking-wider font-medium">
                      Suas despesas individuais pagas fora do cartão de crédito
                    </p>
                  </div>
                </DialogContent>
              </Dialog>
            ) : (
              <p className="text-xs text-success font-medium mt-2 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Tudo em dia
              </p>
            )}
          </CardContent>
        </Card>

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
                          <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-normal bg-muted text-muted-foreground border-0">{e.category}</Badge>
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