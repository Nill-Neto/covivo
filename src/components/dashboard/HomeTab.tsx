import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getCompetenceKeyFromDate } from "@/lib/cycleDates";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import { UserPlus, Home, Plus, Shield, ArrowRight, Check, Settings, BarChart3 } from "lucide-react";
import { CustomLoader } from "@/components/ui/custom-loader";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from "recharts";

interface HomeTabProps {
  closingDay: number;
}

export function HomeTab({ closingDay }: HomeTabProps) {
  const { memberships, activeGroupId, setActiveGroupId, user } = useAuth();
  const navigate = useNavigate();

  const chartDataTemplate = useMemo(() => {
    const currentCompKey = getCompetenceKeyFromDate(new Date(), closingDay || 1);
    const [currYear, currMonth] = currentCompKey.split("-").map(Number);
    const comps = [];
    
    for (let i = 5; i >= 0; i--) {
      let m = currMonth - i;
      let y = currYear;
      while (m < 1) {
        m += 12;
        y -= 1;
      }
      const key = `${y}-${String(m).padStart(2, "0")}`;
      const dateObj = new Date(y, m - 1, 1);
      comps.push({
        key,
        label: format(dateObj, "MMM/yy", { locale: ptBR }),
        Coletivo: 0,
        MeuRateio: 0,
        Individual: 0,
      });
    }
    return comps;
  }, [closingDay]);

  const { data: rawData, isLoading } = useQuery({
    queryKey: ["home-expenses-evolution", activeGroupId, user?.id],
    queryFn: async () => {
      if (!activeGroupId || !user?.id) return { expenses: [], installments: [], personalInstallments: [] };
      
      const compKeys = chartDataTemplate.map(c => c.key);
      const competenceWindowFilter = chartDataTemplate
        .map(c => {
          const [y, m] = c.key.split("-").map(Number);
          return `and(bill_year.eq.${y},bill_month.eq.${m})`;
        })
        .join(",");

      const [expensesRes, installmentsRes, personalInstallmentsRes] = await Promise.all([
        supabase
          .from("expenses")
          .select("id, amount, expense_type, created_by, purchase_date, payment_method, competence_key, expense_splits(user_id, amount)")
          .eq("group_id", activeGroupId)
          .in("competence_key", compKeys),
          
        supabase
          .from("expense_installments")
          .select("amount, bill_month, bill_year, expenses!inner(group_id, expense_type)")
          .eq("user_id", user.id)
          .eq("expenses.group_id", activeGroupId)
          .eq("expenses.expense_type", "individual")
          .or(competenceWindowFilter),
          
        supabase
          .from("personal_expense_installments")
          .select("amount, bill_month, bill_year")
          .eq("user_id", user.id)
          .or(competenceWindowFilter)
      ]);

      if (expensesRes.error) throw expensesRes.error;
      if (installmentsRes.error) throw installmentsRes.error;
      if (personalInstallmentsRes.error) throw personalInstallmentsRes.error;
      
      return { 
        expenses: expensesRes.data || [], 
        installments: installmentsRes.data || [], 
        personalInstallments: personalInstallmentsRes.data || [] 
      };
    },
    enabled: !!activeGroupId && !!user?.id,
  });

  const populatedData = useMemo(() => {
    const dataCopy = chartDataTemplate.map((c) => ({ ...c, Coletivo: 0, MeuRateio: 0, Individual: 0 }));
    if (!rawData) return dataCopy;

    rawData.expenses.forEach((e) => {
      const key = e.competence_key || (e.purchase_date ? getCompetenceKeyFromDate(new Date(`${e.purchase_date}T12:00:00`), closingDay || 1) : null);
      if (!key) return;
      const bucket = dataCopy.find((c) => c.key === key);
      
      if (bucket) {
        if (e.expense_type === "collective") {
          bucket.Coletivo += Number(e.amount || 0);
          const mySplit = e.expense_splits?.find((s: { user_id: string; amount: number | string | null }) => s.user_id === user?.id);
          if (mySplit) {
            bucket.MeuRateio += Number(mySplit.amount || 0);
          }
        }
        if (e.expense_type === "individual" && e.created_by === user?.id && e.payment_method !== "credit_card") {
          bucket.Individual += Number(e.amount || 0);
        }
      }
    });

    rawData.installments.forEach((i) => {
      const key = `${i.bill_year}-${String(i.bill_month).padStart(2, "0")}`;
      const bucket = dataCopy.find((c) => c.key === key);
      if (bucket) {
        bucket.Individual += Number(i.amount || 0);
      }
    });

    rawData.personalInstallments.forEach((i) => {
      const key = `${i.bill_year}-${String(i.bill_month).padStart(2, "0")}`;
      const bucket = dataCopy.find((c) => c.key === key);
      if (bucket) {
        bucket.Individual += Number(i.amount || 0);
      }
    });

    return dataCopy.map(b => ({
      ...b,
      Coletivo: Number(b.Coletivo.toFixed(2)),
      MeuRateio: Number(b.MeuRateio.toFixed(2)),
      Individual: Number(b.Individual.toFixed(2)),
    }));
  }, [rawData, chartDataTemplate, user?.id, closingDay]);

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="flex flex-col shadow-sm bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-base">
              <div className="flex items-center gap-2">
                <Home className="h-5 w-5 text-foreground" />
                Meus Grupos
              </div>
              <Button size="sm" variant="ghost" asChild className="h-8 px-2 text-primary hover:bg-primary/10">
                <Link to="/groups/new"><Plus className="h-4 w-4 mr-1" /> Novo grupo</Link>
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-3">
            <div className="space-y-2 flex-1 max-h-[300px] overflow-y-auto pr-1">
              {memberships.map(m => {
                const isActive = m.group_id === activeGroupId;
                const initials = m.group_name.substring(0, 2).toUpperCase();

                return (
                  <div
                    key={m.group_id}
                    onClick={() => setActiveGroupId(m.group_id)}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors",
                      isActive ? "bg-primary/5 border-primary/30" : "hover:bg-muted/50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 shrink-0 border border-border/50">
                        <AvatarImage src={m.avatar_url || ""} />
                        <AvatarFallback className={cn("font-semibold", isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className={cn("text-sm font-medium truncate", isActive ? "text-foreground" : "text-muted-foreground")}>
                          {m.group_name}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize flex items-center gap-1">
                          {m.role === 'admin' ? <Shield className="h-3 w-3" /> : null} {m.role}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {isActive && <Check className="h-4 w-4 text-primary shrink-0" />}
                      {m.role === 'admin' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-primary z-10"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (m.group_id !== activeGroupId) {
                              setActiveGroupId(m.group_id);
                            }
                            navigate("/settings", { state: { tab: "group" } });
                          }}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col border-l-4 border-l-primary shadow-sm bg-card h-full justify-between">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Convidar Participantes
            </CardTitle>
            <CardDescription>
              Traga seus colegas para dividir despesas e organizar a casa no Covivo.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-end pb-6">
            <Button asChild className="w-full sm:w-auto gap-2">
              <Link to="/invites">
                Enviar convite <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm bg-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Evolução de Gastos (Últimos 6 meses)
          </CardTitle>
          <CardDescription>
            Acompanhe o total da casa, a sua parte no rateio e seus gastos individuais, já considerando as parcelas futuras de cartões de crédito.
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[340px] w-full pt-4">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <CustomLoader className="h-6 w-6 text-primary" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={populatedData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="label" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} 
                  dy={10} 
                />
                <YAxis 
                  width={75}
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} 
                  tickFormatter={(val) => `R$ ${val}`} 
                />
                <RechartsTooltip
                  cursor={{ stroke: "hsl(var(--muted))", strokeWidth: 2, strokeDasharray: "3 3" }}
                  contentStyle={{ 
                    borderRadius: "8px", 
                    border: "1px solid hsl(var(--border))", 
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)", 
                    fontSize: "12px", 
                    backgroundColor: "hsl(var(--background))", 
                    color: "hsl(var(--foreground))" 
                  }}
                  formatter={(val: number) => `R$ ${val.toFixed(2)}`}
                />
                <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "20px" }} />
                
                <Line 
                  type="monotone"
                  dataKey="Coletivo" 
                  name="Total Casa (Referência)" 
                  stroke="hsl(var(--muted-foreground))" 
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line 
                  type="monotone"
                  dataKey="MeuRateio" 
                  name="Meu Rateio" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3}
                  dot={{ r: 4, strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />
                <Line 
                  type="monotone"
                  dataKey="Individual" 
                  name="Meus Gastos (Individuais)" 
                  stroke="#0ea5e9"
                  strokeWidth={3}
                  dot={{ r: 4, strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}