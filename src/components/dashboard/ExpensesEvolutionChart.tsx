import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { subMonths, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CustomLoader } from "@/components/ui/custom-loader";

export function ExpensesEvolutionChart() {
  const { user, membership } = useAuth();
  const [monthsCount, setMonthsCount] = useState<6 | 12>(6);
  const currentDate = new Date();

  const lastMonths = useMemo(
    () => Array.from({ length: monthsCount }, (_, index) => subMonths(currentDate, (monthsCount - 1) - index)),
    [currentDate, monthsCount]
  );

  const { data: evolutionData, isLoading } = useQuery({
    queryKey: ["expenses-evolution", user?.id, membership?.group_id, monthsCount],
    queryFn: async () => {
      if (!user?.id || !membership?.group_id) return [];

      const startDate = format(subMonths(currentDate, monthsCount), "yyyy-MM-dd");

      const [personalRes, collectiveRes] = await Promise.all([
        supabase
          .from("expenses")
          .select("amount, purchase_date")
          .eq("created_by", user.id)
          .eq("expense_type", "individual")
          .gte("purchase_date", startDate),
        supabase
          .from("expense_splits")
          .select("amount, expenses!inner(purchase_date, group_id)")
          .eq("user_id", user.id)
          .eq("expenses.group_id", membership.group_id)
          .gte("expenses.purchase_date", startDate),
      ]);

      if (personalRes.error) throw personalRes.error;
      if (collectiveRes.error) throw collectiveRes.error;

      const totalsByMonth: Record<string, { personal: number; collective: number }> = {};
      lastMonths.forEach(date => {
        const key = format(date, "yyyy-MM");
        totalsByMonth[key] = { personal: 0, collective: 0 };
      });

      personalRes.data?.forEach(expense => {
        const key = format(new Date(expense.purchase_date), "yyyy-MM");
        if (totalsByMonth[key]) {
          totalsByMonth[key].personal += expense.amount;
        }
      });

      collectiveRes.data?.forEach(split => {
        if (split.expenses) {
          const key = format(new Date(split.expenses.purchase_date), "yyyy-MM");
          if (totalsByMonth[key]) {
            totalsByMonth[key].collective += split.amount;
          }
        }
      });

      return lastMonths.map(date => {
        const key = format(date, "yyyy-MM");
        return {
          monthLabel: format(date, "MMM/yy", { locale: ptBR }),
          pessoal: Number(totalsByMonth[key].personal.toFixed(2)),
          coletivo: Number(totalsByMonth[key].collective.toFixed(2)),
        };
      });
    },
    enabled: !!user?.id && !!membership?.group_id,
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Evolução de Gastos</CardTitle>
        <Select value={String(monthsCount)} onValueChange={(v) => setMonthsCount(Number(v) as 6 | 12)}>
          <SelectTrigger className="w-[130px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="6">Últimos 6 meses</SelectItem>
            <SelectItem value="12">Últimos 12 meses</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
            <CustomLoader className="h-5 w-5 mr-2" /> Carregando...
          </div>
        ) : (
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={evolutionData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" />
                <XAxis dataKey="monthLabel" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `R$${value}`} />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                <Line type="monotone" dataKey="pessoal" name="Pessoal" stroke="hsl(var(--primary))" strokeWidth={2} />
                <Line type="monotone" dataKey="coletivo" name="Coletivo" stroke="hsl(var(--secondary-foreground))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}