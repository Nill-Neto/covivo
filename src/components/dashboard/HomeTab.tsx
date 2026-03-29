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
import { UserPlus, Home, Plus, Shield, ArrowRight, Check, Settings, BarChart3, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from "recharts";

interface HomeTabProps {
  closingDay: number;
}

export function HomeTab({ closingDay }: HomeTabProps) {
  const { memberships, activeGroupId, setActiveGroupId, user } = useAuth();
  const navigate = useNavigate();

  // Gera as últimas 6 competências baseadas na data atual e no dia de fechamento
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
        Individual: 0,
      });
    }
    return comps;
  }, [closingDay]);

  // A data de início precisa ser um pouco antes da primeira competência para não perder lançamentos
  const startDateQuery = useMemo(() => {
    const firstComp = chartDataTemplate[0];
    const [y, m] = firstComp.key.split("-").map(Number);
    let startM = m - 1;
    let startY = y;
    if (startM < 1) {
      startM = 12;
      startY--;
    }
    return `${startY}-${String(startM).padStart(2, "0")}-01`;
  }, [chartDataTemplate]);

  // Busca as despesas dos últimos 6 meses
  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ["home-expenses-evolution", activeGroupId, startDateQuery],
    queryFn: async () => {
      if (!activeGroupId) return [];
      const { data, error } = await supabase
        .from("expenses")
        .select("amount, expense_type, created_by, purchase_date")
        .eq("group_id", activeGroupId)
        .gte("purchase_date", startDateQuery);
      if (error) throw error;
      return data || [];
    },
    enabled: !!activeGroupId,
  });

  // Preenche o template com os dados agrupados por competência
  const populatedData = useMemo(() => {
    const dataCopy = chartDataTemplate.map((c) => ({ ...c }));
    
    expenses.forEach((e) => {
      if (!e.purchase_date) return;
      const key = getCompetenceKeyFromDate(new Date(`${e.purchase_date}T12:00:00`), closingDay || 1);
      const bucket = dataCopy.find((c) => c.key === key);
      
      if (bucket) {
        if (e.expense_type === "collective") {
          bucket.Coletivo += Number(e.amount || 0);
        }
        if (e.expense_type === "individual" && e.created_by === user?.id) {
          bucket.Individual += Number(e.amount || 0);
        }
      }
    });
    return dataCopy;
  }, [expenses, chartDataTemplate, closingDay, user?.id]);

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid gap-4 md:grid-cols-2">
        {/* Card Grupos */}
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
                      
                      {/* O botão de configurações só aparece se a pessoa for admin */}
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

        {/* Card Convites */}
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

      {/* Gráfico de Evolução */}
      <Card className="shadow-sm bg-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Evolução de Gastos (Últimos 6 meses)
          </CardTitle>
          <CardDescription>
            Comparativo entre o total de gastos coletivos da casa e os seus gastos individuais.
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[320px] w-full pt-4">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={populatedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="label" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} 
                  dy={10} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} 
                  tickFormatter={(val) => `R$ ${val}`} 
                />
                <RechartsTooltip
                  cursor={{ fill: "hsl(var(--muted)/0.4)" }}
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
                <Bar 
                  dataKey="Coletivo" 
                  name="Coletivos (Casa)" 
                  fill="hsl(var(--primary))" 
                  radius={[4, 4, 0, 0]} 
                  maxBarSize={40} 
                />
                <Bar 
                  dataKey="Individual" 
                  name="Individuais (Meus)" 
                  fill="#0ea5e9" /* Blue-sky contrastante para individual */
                  radius={[4, 4, 0, 0]} 
                  maxBarSize={40} 
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

    </div>
  );
}