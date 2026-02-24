import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, AlertCircle, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, CartesianGrid } from "recharts";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { CHART_COLORS, CATEGORY_COLORS } from "@/constants/categories";

interface PersonalTabProps {
  totalIndividualPending: number;
  individualPending: any[];
  totalPersonalCash: number;
  totalBill: number;
  personalChartData: any[];
  myPersonalExpenses: any[];
  onPayIndividual: () => void;
}

export function PersonalTab({
  totalIndividualPending,
  individualPending,
  totalPersonalCash,
  totalBill,
  personalChartData,
  myPersonalExpenses,
  onPayIndividual,
}: PersonalTabProps) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-warning/30 bg-warning/5 transition-all hover:bg-warning/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-warning-foreground">Pendências Individuais</CardTitle>
            <AlertCircle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-serif text-warning-foreground">R$ {totalIndividualPending.toFixed(2)}</div>
            {individualPending.length > 0 && (
              <Button variant="outline" size="sm" className="mt-3 w-full border-warning/50 text-warning-foreground hover:bg-warning/20" onClick={onPayIndividual}>
                Ver Detalhes
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Gastos à Vista (Ciclo)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-serif">R$ {totalPersonalCash.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">Débito, Dinheiro ou Pix</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Fatura Atual Estimada</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-serif">R$ {totalBill.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">Soma de todos os cartões</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-12">
        <Card className="md:col-span-8 lg:col-span-8">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Meus Gastos Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-4">
                {myPersonalExpenses.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-10 text-muted-foreground">
                    <p className="text-sm">Nenhuma despesa pessoal encontrada.</p>
                  </div>
                ) : (
                  myPersonalExpenses.slice(0, 15).map(e => (
                    <div key={e.id} className="flex items-center justify-between border-b border-border/40 pb-3 last:border-0 last:pb-0 hover:bg-muted/30 p-2 rounded-md transition-colors">
                      <div className="flex flex-col gap-1">
                        <p className="text-sm font-medium">{e.title}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-normal bg-muted text-muted-foreground border-0">{e.category}</Badge>
                          <span className="text-[10px] text-muted-foreground">{format(new Date(e.purchase_date), "dd/MM")} • {e.payment_method === 'credit_card' ? 'Cartão' : 'À vista'}</span>
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
            <CardTitle className="text-base">Top Categorias</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-[300px]">
            {personalChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={personalChartData} 
                  margin={{ left: 0, right: 0, top: 10, bottom: 0 }}
                  barGap={8}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 10, fill: "#64748b" }} 
                    axisLine={false} 
                    tickLine={false} 
                    interval={0}
                  />
                  <YAxis 
                    hide 
                  />
                  <RechartsTooltip 
                    cursor={{fill: 'transparent'}} 
                    formatter={(v: number) => [`R$ ${v.toFixed(2)}`, 'Valor']}
                    contentStyle={{ 
                      borderRadius: "8px", 
                      border: "1px solid #e2e8f0", 
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                      fontSize: "12px",
                      backgroundColor: "rgba(255, 255, 255, 0.95)"
                    }} 
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={32} animationDuration={1000}>
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