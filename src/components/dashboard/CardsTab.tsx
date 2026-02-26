import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet, CreditCard, Plus, PieChart as PieChartIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from "recharts";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { CHART_COLORS, CATEGORY_COLORS } from "@/constants/categories";
import { cn } from "@/lib/utils";

interface CardsTabProps {
  totalBill: number;
  currentDate: Date;
  cardsChartData: any[];
  creditCards: any[];
  cardsBreakdown: Record<string, number>;
  billInstallments: any[];
}

export function CardsTab({
  totalBill,
  currentDate,
  cardsChartData,
  creditCards,
  cardsBreakdown,
  billInstallments,
}: CardsTabProps) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid gap-6 md:grid-cols-3">
        {/* Total em Faturas Card */}
        <Card className="bg-gradient-to-br from-indigo-600 to-indigo-800 text-white md:col-span-1 shadow-lg shadow-indigo-500/20 border-0 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <CreditCard className="h-24 w-24 transform rotate-12 translate-x-4 -translate-y-4" />
          </div>
          
          <CardHeader className="pb-2 relative z-10">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-indigo-100/90">Total em Faturas</CardTitle>
            <div className="p-2 bg-white/10 w-fit rounded-lg mt-2">
              <Wallet className="h-5 w-5 text-indigo-50" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-sm font-medium text-indigo-200 translate-y-[-2px]">R$</span>
              <div className="text-4xl font-serif font-bold tracking-tight text-white">{totalBill.toFixed(2)}</div>
            </div>
            
            <div className="flex items-center gap-2 mt-4">
               <Badge variant="secondary" className="bg-white/10 hover:bg-white/20 text-indigo-50 border-0 font-normal">
                  Ref: {format(currentDate, "MMMM/yyyy")}
               </Badge>
            </div>
            
            <Button variant="secondary" size="sm" className="mt-6 w-full font-medium bg-white text-indigo-700 hover:bg-indigo-50 border-0 shadow-sm" asChild>
              <Link to="/personal/bills">Ver Extrato Detalhado</Link>
            </Button>
          </CardContent>
        </Card>

        {/* Chart Card */}
        <Card className="md:col-span-2 shadow-sm border-0 bg-white dark:bg-card flex flex-col">
          <CardHeader className="border-b bg-muted/20 pb-4 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <PieChartIcon className="h-4 w-4" /> Composição da Fatura
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex items-center justify-center min-h-[250px] p-6">
            {cardsChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={cardsChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                    stroke="none"
                    cornerRadius={6}
                  >
                    {cardsChartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={CATEGORY_COLORS[entry.name] || CHART_COLORS[index % CHART_COLORS.length]} 
                        className="hover:opacity-80 transition-opacity"
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
                  />
                  <Legend 
                    layout="vertical" 
                    verticalAlign="middle" 
                    align="right"
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: "12px", color: "hsl(var(--muted-foreground))" }}
                    formatter={(value) => <span className="text-muted-foreground ml-1 font-medium">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center text-muted-foreground text-sm opacity-60">
                <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-4">
                   <CreditCard className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <p>Fatura zerada neste mês</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
           <h3 className="text-lg font-bold flex items-center gap-2 text-foreground/90 tracking-tight">
             <CreditCard className="h-5 w-5 text-primary" /> Meus Cartões
           </h3>
           <Button variant="outline" size="sm" className="h-8 text-xs gap-1" asChild>
             <Link to="/personal/cards"><Plus className="h-3.5 w-3.5" /> Gerenciar Cartões</Link>
           </Button>
        </div>
        
        {creditCards.length === 0 ? (
          <Card className="border-dashed bg-muted/20 border-2">
            <CardContent className="py-12 flex flex-col items-center justify-center text-center">
              <div className="bg-background p-4 rounded-full mb-4 shadow-sm border">
                <CreditCard className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-foreground font-semibold mb-1">Nenhum cartão cadastrado</p>
              <p className="text-sm text-muted-foreground mb-6 max-w-[250px]">
                Cadastre seus cartões para controlar as faturas e parcelamentos automaticamente.
              </p>
              <Button asChild className="px-8 font-medium shadow-sm"><Link to="/personal/cards">Cadastrar Primeiro Cartão</Link></Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {creditCards.map(card => {
              const billValue = cardsBreakdown[card.id] || 0;
              return (
                <div key={card.id} className="group relative">
                  {/* Card Visual Layer */}
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl transform translate-y-1 translate-x-1 opacity-10 group-hover:translate-y-2 group-hover:translate-x-2 transition-transform duration-300 -z-10" />
                  
                  <Card className="h-full flex flex-col justify-between transition-all hover:-translate-y-1 hover:shadow-xl border-0 ring-1 ring-border bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950">
                    <CardHeader className="pb-4 pt-6 px-6">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <CardTitle className="text-lg font-bold text-foreground tracking-tight">{card.label}</CardTitle>
                          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">{card.brand}</p>
                        </div>
                        <div className="flex h-8 w-12 rounded bg-slate-200 dark:bg-slate-800/50 opacity-50" />
                      </div>
                    </CardHeader>
                    
                    <CardContent className="px-6 pb-6 pt-0">
                      <div className="mb-6 mt-2">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-1 opacity-70">Fatura Atual</p>
                        <div className="flex items-baseline gap-1">
                           <span className="text-sm font-medium text-muted-foreground">R$</span>
                           <span className="text-3xl font-serif font-bold text-foreground">{billValue.toFixed(2)}</span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 text-[10px] uppercase tracking-wider font-medium">
                        <div className="bg-background/50 p-2 rounded border border-border/50 backdrop-blur-sm">
                          <span className="text-muted-foreground block mb-0.5">Fecha dia</span>
                          <span className="text-sm font-bold text-foreground">{card.closing_day}</span>
                        </div>
                        <div className="bg-background/50 p-2 rounded border border-border/50 backdrop-blur-sm">
                          <span className="text-muted-foreground block mb-0.5">Vence dia</span>
                          <span className="text-sm font-bold text-foreground">{card.due_day}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
            
            {/* Add Card Button (Styled as a ghost card) */}
            <Link to="/personal/cards" className="flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/20 rounded-xl h-full min-h-[220px] hover:bg-muted/30 hover:border-primary/50 transition-all group cursor-pointer">
              <div className="h-12 w-12 rounded-full bg-muted group-hover:bg-primary/10 flex items-center justify-center mb-3 transition-colors duration-300">
                <Plus className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <span className="text-sm font-semibold text-muted-foreground group-hover:text-primary transition-colors">Adicionar Novo Cartão</span>
            </Link>
          </div>
        )}
      </div>

      <Card className="shadow-sm border-0 bg-white dark:bg-card">
        <CardHeader className="pb-4 border-b bg-muted/20">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Últimos Lançamentos (Fatura)</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="divide-y divide-border/50">
            {billInstallments.slice(0, 5).map((i: any, idx: number) => (
              <div key={idx} className="flex justify-between items-center py-4 hover:bg-muted/30 px-4 -mx-4 transition-colors">
                <div className="min-w-0 pr-4 flex flex-col">
                  <span className="text-sm font-semibold text-foreground truncate">{i.expenses?.title}</span>
                  <div className="flex items-center gap-2 mt-1">
                     <Badge variant="outline" className="text-[10px] font-normal h-5 border-border text-muted-foreground">
                       {i.expenses?.category}
                     </Badge>
                     <span className="text-[10px] text-muted-foreground">
                        {format(new Date(i.expenses?.purchase_date || new Date()), "dd/MM")}
                     </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-serif font-bold text-sm block text-foreground">R$ {Number(i.amount).toFixed(2)}</span>
                  <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
                     {i.installment_number > 1 ? `Parc. ${i.installment_number}` : 'À vista'}
                  </span>
                </div>
              </div>
            ))}
            {billInstallments.length === 0 && (
              <div className="py-12 text-center text-muted-foreground text-sm flex flex-col items-center gap-3">
                <div className="h-12 w-12 bg-muted rounded-full flex items-center justify-center">
                   <CreditCard className="h-6 w-6 text-muted-foreground/50" />
                </div>
                <p>Nenhum lançamento nesta fatura.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
