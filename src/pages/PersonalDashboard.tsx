import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Wallet, CreditCard, TrendingDown, Calendar, ArrowRight, PieChart as PieIcon } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

const COLORS = ["#0f172a", "#0d9488", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function PersonalDashboard() {
  const { user } = useAuth();
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  // 1. Fetch Personal Expenses (this month)
  const { data: expenses = [] } = useQuery({
    queryKey: ["personal-expenses-month", user?.id],
    queryFn: async () => {
      const start = startOfMonth(now).toISOString();
      const end = endOfMonth(now).toISOString();
      const { data } = await supabase
        .from("personal_expenses")
        .select("*")
        .eq("user_id", user!.id)
        .gte("purchase_date", start)
        .lte("purchase_date", end);
      return data ?? [];
    },
    enabled: !!user,
  });

  // 2. Fetch Installments for current month
  const { data: installments = [] } = useQuery({
    queryKey: ["personal-installments-month", user?.id, currentMonth, currentYear],
    queryFn: async () => {
      const { data } = await supabase
        .from("personal_expense_installments")
        .select("*, personal_expenses(title)")
        .eq("user_id", user!.id)
        .eq("bill_month", currentMonth)
        .eq("bill_year", currentYear);
      return data ?? [];
    },
    enabled: !!user,
  });

  // 3. Fetch user's share of shared expenses (pending)
  const { data: sharedPending = [] } = useQuery({
    queryKey: ["my-shared-pending", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("expense_splits")
        .select("amount")
        .eq("user_id", user!.id)
        .eq("status", "pending");
      return data ?? [];
    },
    enabled: !!user,
  });

  const totalPersonal = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const totalBill = installments.reduce((sum, i) => sum + Number(i.amount), 0);
  const totalShared = sharedPending.reduce((sum, s) => sum + Number(s.amount), 0);

  // Chart data: Expenses by Payment Method
  const methodData = Object.entries(
    expenses.reduce((acc: any, e) => {
      acc[e.payment_method] = (acc[e.payment_method] || 0) + Number(e.amount);
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif">Meu Financeiro</h1>
          <p className="text-muted-foreground mt-1">Visão consolidada dos seus gastos pessoais.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/personal/expenses"><Calendar className="h-4 w-4 mr-2" /> Histórico</Link>
          </Button>
          <Button size="sm" asChild>
            <Link to="/personal/bills"><CreditCard className="h-4 w-4 mr-2" /> Ver Faturas</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-primary text-primary-foreground">
          <CardHeader className="pb-2">
            <CardDescription className="text-primary-foreground/70">Fatura deste mês</CardDescription>
            <CardTitle className="text-3xl font-serif">R$ {totalBill.toFixed(2)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-primary-foreground/60 flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Competência: {format(now, "MMMM", { locale: ptBR })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Gastos do mês (À vista/Pix)</CardDescription>
            <CardTitle className="text-3xl font-serif">R$ {totalPersonal.toFixed(2)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mt-1">
              <Progress value={Math.min(100, (totalPersonal / 5000) * 100)} className="h-1" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-destructive/20 bg-destructive/5">
          <CardHeader className="pb-2">
            <CardDescription className="text-destructive">Rateio da Casa Pendente</CardDescription>
            <CardTitle className="text-3xl font-serif text-destructive">R$ {totalShared.toFixed(2)}</CardTitle>
          </CardHeader>
          <CardContent>
             <Link to="/payments" className="text-xs font-medium text-destructive hover:underline flex items-center gap-1">
               Ir para pagamentos <ArrowRight className="h-3 w-3" />
             </Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="text-lg font-serif">Gastos por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full">
              {methodData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={methodData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {methodData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => `R$ ${v.toFixed(2)}`} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                  Sem dados para este mês.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-lg font-serif">Próximos Vencimentos</CardTitle>
            <CardDescription>Faturas e parcelas futuras.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {installments.slice(0, 4).map((i: any) => (
                <div key={i.id} className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{i.personal_expenses?.title}</p>
                    <p className="text-xs text-muted-foreground">Parcela {i.installment_number}</p>
                  </div>
                  <p className="text-sm font-bold">R$ {Number(i.amount).toFixed(2)}</p>
                </div>
              ))}
              {installments.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhuma parcela para este mês.</p>
              )}
              <Button variant="ghost" className="w-full text-xs" asChild>
                <Link to="/personal/bills">Ver faturas completas</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}