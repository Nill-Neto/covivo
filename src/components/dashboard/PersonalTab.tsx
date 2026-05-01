import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Info, Plus, FileText, Banknote, Landmark, AlertCircle, CheckCircle2 } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { getCategoryIcon, CATEGORY_COLORS, CHART_COLORS } from "@/constants/categories.tsx";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronsUpDown } from "lucide-react";
import { PersonalExpensesChart } from "./PersonalExpensesChart";
import { RepublicChart } from "./RepublicChart";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { P2PBalances } from "./P2PBalances";
import { UnpaidBills } from "./UnpaidBills";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CustomLoader } from "../ui/custom-loader";
import { useCycleDates } from "@/hooks/useCycleDates";
import { formatCompetenceKey } from "@/lib/cycleDates";
import { ExpensesEvolutionChart } from "./ExpensesEvolutionChart";
import { useState } from "react";

type AdminDashboardData = {
  pending_payments_count: number;
  total_debt: number;
  members_in_debt_count: number;
};

function AdminDashboard() {
  const { membership } = useAuth();
  const { currentDate } = useCycleDates(membership?.group_id);
  const currentCompetenceKey = formatCompetenceKey(currentDate);

  const { data, isLoading, error } = useQuery<AdminDashboardData | null>({
    queryKey: ["admin-dashboard-data", membership?.group_id, currentCompetenceKey],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("fetch_admin_dashboard_metrics", {
        _group_id: membership!.group_id,
        _competence_key: currentCompetenceKey,
      });
      if (error) throw error;
      return data as unknown as AdminDashboardData | null;
    },
    enabled: !!membership?.group_id,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-40">
        <CustomLoader />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/50 bg-destructive/5">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Não foi possível carregar os dados administrativos.
          </CardTitle>
          <CardDescription className="text-destructive/80">
            Tente novamente em alguns instantes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground bg-destructive/10 p-2 rounded">
            Detalhes técnicos (dev): {error instanceof Error ? error.message : "Erro desconhecido"}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <div className="flex justify-center items-center h-40 text-muted-foreground">
        Nenhum dado administrativo para exibir.
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>Pagamentos Pendentes</CardTitle>
          <CardDescription>Aprovações necessárias</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{data.pending_payments_count}</div>
        </CardContent>
        <CardFooter>
          <Button size="sm" variant="outline">Ver Pagamentos</Button>
        </CardFooter>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Total a Receber</CardTitle>
          <CardDescription>Soma de todas as dívidas com a casa</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{formatCurrency(data.total_debt)}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Membros com Dívidas</CardTitle>
          <CardDescription>Total de pessoas devendo</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{data.members_in_debt_count}</div>
        </CardContent>
      </Card>
    </div>
  );
}


export function PersonalTab({
  modoGestao,
  p2pBalances,
  closingDay,
  currentDate,
  totalIndividualPending,
  totalCollectivePendingPrevious,
  totalCollectivePendingCurrent,
  collectivePendingPreviousByCompetence,
  collectivePendingCurrentByCompetence,
  individualPending,
  totalPersonalCash,
  totalBill,
  totalUserExpensesCompetence,
  totalUserExpensesCurrentBalance,
  myCollectiveShare,
  personalChartData,
  myPersonalExpenses,
  republicChartData,
  totalMonthExpenses,
  onPayRateio,
  onRegisterPayment,
}) {
  const { isAdmin } = useAuth();
  const [hoveredPersonal, setHoveredPersonal] = useState<string | null>(null);
  const [hoveredRepublic, setHoveredRepublic] = useState<string | null>(null);
  const totalPersonalExpenses = personalChartData.reduce((sum, item) => sum + item.value, 0);

  if (isAdmin && modoGestao === 'centralized') {
    return <AdminDashboard />;
  }

  return (
    <ScrollReveal preset="blur-slide" className="space-y-6">
      {modoGestao === 'p2p' && <P2PBalances balances={p2pBalances} />}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-1 bg-primary text-primary-foreground shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Total Comprometido</span>
              <Banknote className="h-5 w-5" />
            </CardTitle>
            <CardDescription className="text-primary-foreground/80">
              Saldo atual consolidado (inclui pendências anteriores)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{formatCurrency(totalUserExpensesCurrentBalance)}</div>
          </CardContent>
          <CardFooter>
            <Button variant="secondary" className="w-full" asChild>
              <a href="#pending-details">Ver detalhes <ArrowRight className="h-4 w-4 ml-2" /></a>
            </Button>
          </CardFooter>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Resumo da Competência</CardTitle>
            <CardDescription>
              {format(currentDate, "MMMM/yyyy", { locale: ptBR })}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <p className="text-muted-foreground">Rateio da Casa</p>
              <p className="font-medium">{formatCurrency(myCollectiveShare)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">Pendências Individuais</p>
              <p className="font-medium">{formatCurrency(totalIndividualPending)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">Total da Competência</p>
              <p className="font-semibold text-base">{formatCurrency(totalUserExpensesCompetence)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">Pendências Anteriores</p>
              <p className="font-medium">{formatCurrency(totalCollectivePendingPrevious)}</p>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {modoGestao === 'p2p' && <UnpaidBills onRegisterPayment={onRegisterPayment} />}

      <div id="pending-details" className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Rateio Pendente (Anteriores)
              <Badge variant={totalCollectivePendingPrevious > 0 ? "destructive" : "default"}>
                {formatCurrency(totalCollectivePendingPrevious)}
              </Badge>
            </CardTitle>
            <CardDescription>Dívidas de competências passadas com a casa.</CardDescription>
          </CardHeader>
          {totalCollectivePendingPrevious > 0 ? (
            <>
              <CardContent>
                <PendingList itemsByCompetence={collectivePendingPreviousByCompetence} />
              </CardContent>
              <CardFooter>
                <Button className="w-full" onClick={() => onPayRateio('previous')}>
                  <Landmark className="h-4 w-4 mr-2" /> Pagar Pendências Anteriores
                </Button>
              </CardFooter>
            </>
          ) : (
            <CardContent>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-4 text-center">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span>Sem pendências anteriores.</span>
              </div>
            </CardContent>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Rateio em Aberto (Atual)
              <Badge variant={totalCollectivePendingCurrent > 0 ? "secondary" : "default"}>
                {formatCurrency(totalCollectivePendingCurrent)}
              </Badge>
            </CardTitle>
            <CardDescription>Sua parte nas despesas da competência vigente.</CardDescription>
          </CardHeader>
          {totalCollectivePendingCurrent > 0 ? (
            <>
              <CardContent>
                <PendingList itemsByCompetence={collectivePendingCurrentByCompetence} />
              </CardContent>
              <CardFooter>
                <Button className="w-full" onClick={() => onPayRateio('current')}>
                  <Landmark className="h-4 w-4 mr-2" /> Pagar Rateio Atual
                </Button>
              </CardFooter>
            </>
          ) : (
            <CardContent>
              <p className="text-sm text-muted-foreground py-4 text-center">Nenhum item do rateio atual para pagar.</p>
            </CardContent>
          )}
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Pendências Individuais
              <Badge variant={totalIndividualPending > 0 ? "secondary" : "default"}>
                {formatCurrency(totalIndividualPending)}
              </Badge>
            </CardTitle>
            <CardDescription>Controle de gastos individuais que não entram no rateio.</CardDescription>
          </CardHeader>
          {individualPending.length > 0 ? (
            <CardContent>
              <ScrollArea className="h-60">
                <div className="space-y-3 pr-4">
                  {individualPending.map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-3">
                        <div className="bg-muted p-2 rounded-md">
                          {getCategoryIcon(item.expenses?.category, "h-4 w-4 text-muted-foreground")}
                        </div>
                        <div>
                          <p className="font-medium line-clamp-1">{item.expenses?.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(parseISO(item.expenses?.purchase_date), "'Comprado em' dd/MM/yy")}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(item.amount)}</p>
                        {item.installment_number && (
                          <p className="text-xs text-muted-foreground">
                            {item.installment_number}/{item.expenses.installments}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          ) : (
            <CardContent>
              <p className="text-sm text-muted-foreground py-4 text-center">Nenhum controle pendente.</p>
            </CardContent>
          )}
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Gastos à Vista</CardTitle>
              <CardDescription>Dinheiro, Pix ou Débito.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(totalPersonalCash)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Fatura dos Cartões</CardTitle>
              <CardDescription>Soma das faturas da competência.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(totalBill)}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Meus Gastos Pessoais</CardTitle>
            <CardDescription>Visão geral das suas despesas individuais na competência.</CardDescription>
          </CardHeader>
          <CardContent className="h-auto flex flex-col md:flex-row items-center justify-center gap-6 p-4 md:p-6">
            <PersonalExpensesChart data={personalChartData} total={totalPersonalExpenses} onHover={setHoveredPersonal} hoveredLabel={hoveredPersonal} />
            <div className="flex-1 flex flex-col space-y-2 w-full overflow-y-auto max-h-[200px] pr-2 scrollbar-thin">
              {personalChartData.map((segment, index) => (
                <div
                  key={segment.name}
                  className={cn(
                    "flex items-center justify-between p-2 rounded-md transition-colors cursor-default text-sm gap-3",
                    hoveredPersonal === segment.name ? "bg-muted" : "hover:bg-muted/50"
                  )}
                  onMouseEnter={() => setHoveredPersonal(segment.name)}
                  onMouseLeave={() => setHoveredPersonal(null)}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: CATEGORY_COLORS[segment.name] || CHART_COLORS[index % CHART_COLORS.length] }}
                    />
                    <span className="font-medium truncate text-muted-foreground" title={segment.name}>
                      {segment.name}
                    </span>
                  </div>
                  <span className="font-semibold tabular-nums shrink-0 whitespace-nowrap text-right text-foreground">
                    R$ {segment.value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Despesas da Moradia</CardTitle>
            <CardDescription>
              Total de {formatCurrency(totalMonthExpenses)} na competência.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-auto flex flex-col md:flex-row items-center justify-center gap-6 p-4 md:p-6">
            <RepublicChart data={republicChartData} total={totalMonthExpenses} onHover={setHoveredRepublic} hoveredLabel={hoveredRepublic} />
            <div className="flex-1 flex flex-col space-y-2 w-full overflow-y-auto max-h-[200px] pr-2 scrollbar-thin">
              {republicChartData.map((segment, index) => (
                <div
                  key={segment.name}
                  className={cn(
                    "flex items-center justify-between p-2 rounded-md transition-colors cursor-default text-sm gap-3",
                    hoveredRepublic === segment.name ? "bg-muted" : "hover:bg-muted/50"
                  )}
                  onMouseEnter={() => setHoveredRepublic(segment.name)}
                  onMouseLeave={() => setHoveredRepublic(null)}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: CATEGORY_COLORS[segment.name] || CHART_COLORS[index % CHART_COLORS.length] }}
                    />
                    <span className="font-medium truncate text-muted-foreground" title={segment.name}>
                      {segment.name}
                    </span>
                  </div>
                  <span className="font-semibold tabular-nums shrink-0 whitespace-nowrap text-right text-foreground">
                    R$ {segment.value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <ExpensesEvolutionChart currentDate={currentDate} />
    </ScrollReveal>
  );
}


function PendingList({ itemsByCompetence }) {
  return (
    <ScrollArea className="h-60">
      <div className="space-y-2 pr-4">
        {itemsByCompetence.map(({ competenceKey, items, total }) => (
          <Collapsible key={competenceKey} defaultOpen className="space-y-2">
            <div className="flex items-center justify-between">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="flex items-center gap-2 px-1 text-left h-auto">
                  <ChevronsUpDown className="h-4 w-4" />
                  <div className="flex flex-col">
                    <span className="font-semibold capitalize">
                      {format(parseISO(`${competenceKey}-02`), "MMMM yyyy", { locale: ptBR })}
                    </span>
                    <span className="text-xs text-muted-foreground">{items.length} itens</span>
                  </div>
                </Button>
              </CollapsibleTrigger>
              <Badge variant="secondary">{formatCurrency(total)}</Badge>
            </div>
            <CollapsibleContent className="space-y-3 pl-5 border-l ml-3 py-2">
              {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3">
                    <div className="bg-muted p-2 rounded-md">
                      {getCategoryIcon(item.expenses?.category, "h-4 w-4 text-muted-foreground")}
                    </div>
                    <div>
                      <p className="font-medium line-clamp-1">{item.expenses?.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(item.expenses?.purchase_date), "'Em' dd/MM/yy")}
                      </p>
                    </div>
                  </div>
                  <p className="font-semibold">{formatCurrency(item.amount)}</p>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>
    </ScrollArea>
  );
}