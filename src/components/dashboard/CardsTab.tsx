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
        <Card className="bg-gradient-to-br from-primary to-blue-700 text-primary-foreground md:col-span-1 shadow-md border-0 relative overflow-hidden">
          <CardHeader className="pb-2 relative z-10">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider opacity-90">Total em Faturas</CardTitle>
            <div className="p-2 bg-white/10 w-fit rounded-lg mt-2">
              <Wallet className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-sm font-medium opacity-80 translate-y-[-2px]">R$</span>
              <div className="text-3xl font-bold tracking-tight text-white">{totalBill.toFixed(2)}</div>
            </div>
            
            <div className="flex items-center gap-2 mt-4">
               <Badge variant="secondary" className="bg-white/10 hover:bg-white/20 text-white border-0 font-normal">
                  Ref: {format(currentDate, "MMMM/yyyy")}
               </Badge>
            </div>
            
            <Button variant="secondary" size="sm" className="mt-6 w-full font-medium bg-white text-primary hover:bg-white/90 border-0 shadow-sm" asChild>
              <Link to="/personal/bills">Ver Extrato Detalhado</Link>
            </Button>
          </CardContent>
        </Card>

        {/* Chart Card */}
        <Card className="md:col-span-2 shadow-sm border bg-card flex flex-col">
          <CardHeader className="border-b bg-muted/30 pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <PieChartIcon className="h-4 w-4" /> Composição da Fatura
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex items-center justify-center min-h-[200px] p-4">
            {cardsChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={cardsChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {cardsChartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={CATEGORY_COLORS[entry.name] || CHART_COLORS[index % CHART_COLORS.length]} 
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
                    layout="vertical" 
                    verticalAlign="middle" 
                    align="right"
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: "12px", color: "var(--muted-foreground)" }}
                    formatter={(value) => <span className="text-muted-foreground ml-1">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center text-muted-foreground text-sm opacity-60">
                <div className="h-12 w-12 bg-muted rounded-full flex items-center justify-center mb-2">
                   <CreditCard className="h-6 w-6 text-muted-foreground/50" />
                </div>
                <p>Fatura zerada neste mês</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {creditCards.map(card => {
              const billValue = cardsBreakdown[card.id] || 0;
              return (
                <Card key={card.id} className="flex flex-col justify-between hover:shadow-md transition-all border-l-4 border-l-primary/80 bg-card">
                  <CardHeader className="pb-2 pt-4 px-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-base font-bold text-foreground tracking-tight">{card.label}</CardTitle>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">{card.brand}</p>
                      </div>
                      <div className="h-6 w-10 bg-muted/50 rounded flex items-center justify-center">
                         <CreditCard className="h-3 w-3 text-muted-foreground" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="mb-4 mt-2">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold mb-1 opacity-70">Fatura Atual</p>
                      <div className="flex items-baseline gap-1">
                         <span className="text-sm font-medium text-muted-foreground">R$</span>
                         <span className="text-2xl font-bold text-foreground">{billValue.toFixed(2)}</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-[10px] uppercase tracking-wider font-medium">
                      <div className="bg-muted/30 p-2 rounded border border-border">
                        <span className="text-muted-foreground block mb-0.5">Fecha dia</span>
                        <span className="text-sm font-bold text-foreground">{card.closing_day}</span>
                      </div>
                      <div className="bg-muted/30 p-2 rounded border border-border">
                        <span className="text-muted-foreground block mb-0.5">Vence dia</span>
                        <span className="text-sm font-bold text-foreground">{card.due_day}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            
            {/* Add Card Button */}
            <Link to="/personal/cards" className="flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/20 rounded-lg h-full min-h-[180px] hover:bg-muted/30 hover:border-primary/50 transition-all group cursor-pointer">
              <div className="h-10 w-10 rounded-full bg-muted group-hover:bg-primary/10 flex items-center justify-center mb-2 transition-colors duration-300">
                <Plus className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <span className="text-sm font-semibold text-muted-foreground group-hover:text-primary transition-colors">Adicionar Novo Cartão</span>
            </Link>
          </div>
        )}
      </div>

      <Card className="shadow-sm border bg-card">
        <CardHeader className="pb-3 border-b bg-muted/30">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Últimos Lançamentos (Fatura)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {billInstallments.slice(0, 5).map((i: any, idx: number) => (
              <div key={idx} className="flex justify-between items-center py-3 hover:bg-muted/30 px-4 transition-colors">
                <div className="min-w-0 pr-4 flex flex-col">
                  <span className="text-sm font-semibold text-foreground truncate">{i.expenses?.title}</span>
                  <div className="flex items-center gap-2 mt-1">
                     <Badge variant="outline" className="text-[10px] font-normal h-5 border-border text-muted-foreground px-1.5">
                       {i.expenses?.category}
                     </Badge>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-bold text-sm block text-foreground">R$ {Number(i.amount).toFixed(2)}</span>
                  <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
                     {i.installment_number > 1 ? `Parc. ${i.installment_number}` : 'À vista'}
                  </span>
                </div>
              </div>
            ))}
            {billInstallments.length === 0 && (
              <div className="py-8 text-center text-muted-foreground text-sm flex flex-col items-center gap-2">
                <div className="h-10 w-10 bg-muted rounded-full flex items-center justify-center">
                   <CreditCard className="h-5 w-5 text-muted-foreground/50" />
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
