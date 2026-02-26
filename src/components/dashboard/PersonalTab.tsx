import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, TrendingUp, Users, Wallet, Calendar, CheckCircle2, Info } from "lucide-react";
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
}: PersonalTabProps) {
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Comprometido */}
        <Card className="sm:col-span-2 bg-primary text-primary-foreground border-0 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Wallet size={80} />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-primary-foreground/70">Total Comprometido (Mês)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold tracking-tight">R$ {totalUserExpenses.toFixed(2)}</div>
            <p className="text-[11px] text-primary-foreground/60 mt-2 font-medium">
              Soma do seu rateio coletivo + seus gastos individuais no cartão.
            </p>
          </CardContent>
        </Card>

        {/* Card de Pendências - Redesenhado */}
        <Card className={`relative flex flex-col justify-between overflow-hidden transition-all border-l-4 ${totalIndividualPending > 0 ? "border-l-destructive bg-destructive/5" : "border-l-success"}`}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Pendências Individuais</CardTitle>
              {totalIndividualPending > 0 ? <AlertCircle className="h-4 w-4 text-destructive" /> : <CheckCircle2 className="h-4 w-4 text-success" />}
            </div>
          </CardHeader>
          <CardContent className="pb-4">
            <div className={`text-2xl font-bold tracking-tight ${totalIndividualPending > 0 ? "text-destructive" : ""}`}>
              R$ {totalIndividualPending.toFixed(2)}
            </div>
            
            {individualPending.length > 0 ? (
              <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
                <DialogTrigger asChild>
                  <Button variant="link" className="h-auto p-0 text-[11px] font-bold text-destructive/80 hover:text-destructive mt-2">
                    VER {individualPending.length} {individualPending.length === 1 ? 'ITEM' : 'ITENS'} DETALHADOS →
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md p-0 overflow-hidden gap-0">
                  <DialogHeader className="p-6 pb-4 bg-muted/30 border-b">
                    <DialogTitle className="flex items-center gap-2 text-foreground font-serif text-xl">
                      <Info className="h-5 w-5 text-primary" />
                      Descrição das Pendências
                    </DialogTitle>
                  </DialogHeader>
                  
                  {/* Container fixo para o scroll */}
                  <div className="h-[400px] flex flex-col">
                    <ScrollArea className="flex-1 w-full px-6 py-4">
                      <div className="space-y-3 pb-4">
                        {individualPending.map((item) => (
                          <div key={item.id} className="flex justify-between items-start p-4 border rounded-xl bg-card shadow-sm">
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-sm text-foreground leading-tight mb-1">{item.expenses?.title}</p>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-3 w-3 text-muted-foreground" />
                                <span className="text-[11px] text-muted-foreground">
                                  {item.expenses?.purchase_date ? format(new Date(item.expenses.purchase_date), "dd 'de' MMMM", { locale: ptBR }) : "Sem data"}
                                </span>
                              </div>
                            </div>
                            <div className="text-right pl-4">
                              <p className="font-bold text-base text-foreground">R$ {Number(item.amount).toFixed(2)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                  
                  <div className="p-4 bg-muted/20 border-t">
                    <p className="text-[10px] text-center text-muted-foreground uppercase font-bold tracking-tighter">
                      Estes valores representam o que você deve individualmente à casa
                    </p>
                  </div>
                </DialogContent>
              </Dialog>
            ) : (
              <p className="text-[11px] text-success font-bold mt-2 uppercase tracking-tighter">Nenhuma pendência</p>
            )}
          </CardContent>
        </Card>

        {/* Gastos à Vista */}
        <Card className="border-l-4 border-l-slate-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Gastos à Vista</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">R$ {totalPersonalCash.toFixed(2)}</div>
            <p className="text-[11px] text-muted-foreground mt-2">Pagos via Pix, Dinheiro ou Débito.</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-12">
        {/* Histórico */}
        <Card className="md:col-span-8">
          <CardHeader className="border-b bg-muted/5 py-4">
            <CardTitle className="text-base flex items-center gap-2 font-serif">
              <TrendingUp className="h-4 w-4 text-primary" /> Histórico Recente
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[300px] w-full px-6">
              <div className="divide-y divide-border/40">
                {myPersonalExpenses.length === 0 ? (
                  <div className="py-20 text-center text-muted-foreground text-sm">Nenhuma despesa registrada.</div>
                ) : (
                  myPersonalExpenses.slice(0, 15).map(e => (
                    <div key={e.id} className="flex items-center justify-between py-4 group hover:bg-muted/10 transition-colors">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">{e.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-[9px] h-4 font-bold uppercase tracking-tighter px-1.5">{e.category}</Badge>
                          <span className="text-[10px] text-muted-foreground font-medium">
                            {format(new Date(e.purchase_date), "dd/MM")} • {e.payment_method === 'credit_card' ? 'Cartão' : 'À vista'}
                          </span>
                        </div>
                      </div>
                      <span className="font-bold text-sm tabular-nums">R$ {Number(e.amount).toFixed(2)}</span>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Gráfico */}
        <Card className="md:col-span-4 flex flex-col">
          <CardHeader className="border-b bg-muted/5 py-4">
            <CardTitle className="text-base font-serif">Top Categorias</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-6 flex flex-col min-h-[300px]">
            {personalChartData.length > 0 ? (
              <div className="flex-1 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={personalChartData} margin={{ top: 10, bottom: 0, left: -20, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 9, fontWeight: 'bold', fill: "#64748b" }} 
                      axisLine={false} 
                      tickLine={false} 
                    />
                    <YAxis hide />
                    <RechartsTooltip 
                      cursor={{fill: 'rgba(0,0,0,0.02)'}}
                      contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "11px", fontWeight: "bold" }}
                      formatter={(v: number) => [`R$ ${v.toFixed(2)}`]}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={24}>
                      {personalChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.name] || CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground text-sm opacity-50">Sem dados.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}