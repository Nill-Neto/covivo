import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { subMonths, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CustomLoader } from "@/components/ui/custom-loader";

interface ExpensesEvolutionChartProps {
  currentDate: Date;
}

export function ExpensesEvolutionChart({ currentDate }: ExpensesEvolutionChartProps) {
  const { user, membership } = useAuth();
  const [monthsCount, setMonthsCount] = useState<6 | 12>(6);

  const lastMonths = useMemo(
    () => Array.from({ length: monthsCount }, (_, index) => subMonths(currentDate, (monthsCount - 1) - index)),
    [currentDate, monthsCount]
  );

  const { data: evolutionData, isLoading } = useQuery({
    queryKey: ["expenses-evolution", user?.id, membership?.group_id, monthsCount, currentDate.toISOString()],
    queryFn: async () => {
      if (!user?.id || !membership?.group_id) return [];

      const competenceKeys = lastMonths.map((date) => format(date, "yyyy-MM"));
      const monthFilters = lastMonths
        .map((date) => `and(competence_year.eq.${date.getFullYear()},competence_month.eq.${date.getMonth() + 1})`)
        .join(",");

      const [cashIndividualRes, myCollectiveInstallmentsRes, myIndividualInstallmentsRes, myPersonalInstallmentsRes, houseCollectiveInstallmentsRes] = await Promise.all([
        supabase
          .from("expenses")
          .select("amount, competence_key")
          .eq("created_by", user.id)
          .eq("expense_type", "individual")
          .eq("group_id", membership.group_id)
          .neq("payment_method", "credit_card")
          .in("competence_key", competenceKeys),
        supabase
          .from("expense_installments")
          .select("amount, competence_year, competence_month, expenses!inner(group_id, expense_type)")
          .eq("user_id", user.id)
          .eq("expenses.group_id", membership.group_id)
          .eq("expenses.expense_type", "collective")
          .or(monthFilters),
        supabase
          .from("expense_installments")
          .select("amount, competence_year, competence_month, expenses!inner(group_id, expense_type)")
          .eq("user_id", user.id)
          .eq("expenses.group_id", membership.group_id)
          .eq("expenses.expense_type", "individual")
          .or(monthFilters),
        supabase
          .from("personal_expense_installments")
          .select("amount, competence_year, competence_month")
          .eq("user_id", user.id)
          .or(monthFilters),
        supabase
          .from("expense_installments")
          .select("amount, competence_year, competence_month, expenses!inner(group_id, expense_type)")
          .eq("expenses.group_id", membership.group_id)
          .eq("expenses.expense_type", "collective")
          .or(monthFilters),
      ]);

      if (cashIndividualRes.error) throw cashIndividualRes.error;
      if (myCollectiveInstallmentsRes.error) throw myCollectiveInstallmentsRes.error;
      if (myIndividualInstallmentsRes.error) throw myIndividualInstallmentsRes.error;
      if (myPersonalInstallmentsRes.error) throw myPersonalInstallmentsRes.error;
      if (houseCollectiveInstallmentsRes.error) throw houseCollectiveInstallmentsRes.error;

      const totalsByMonth: Record<string, { personal: number; myCollective: number; houseCollective: number }> = {};
      lastMonths.forEach(date => {
        const key = format(date, "yyyy-MM");
        totalsByMonth[key] = { personal: 0, myCollective: 0, houseCollective: 0 };
      });

      cashIndividualRes.data?.forEach(expense => {
        const key = expense.competence_key;
        if (totalsByMonth[key]) {
          totalsByMonth[key].personal += expense.amount;
        }
      });

      myCollectiveInstallmentsRes.data?.forEach((item) => {
        const key = `${item.competence_year}-${String(item.competence_month).padStart(2, "0")}`;
        if (totalsByMonth[key]) {
          totalsByMonth[key].myCollective += Number(item.amount);
        }
      });

      myIndividualInstallmentsRes.data?.forEach((item) => {
        const key = `${item.competence_year}-${String(item.competence_month).padStart(2, "0")}`;
        if (totalsByMonth[key]) {
          totalsByMonth[key].personal += Number(item.amount);
        }
      });

      myPersonalInstallmentsRes.data?.forEach((item) => {
        const key = `${item.competence_year}-${String(item.competence_month).padStart(2, "0")}`;
        if (totalsByMonth[key]) {
          totalsByMonth[key].personal += Number(item.amount);
        }
      });

      houseCollectiveInstallmentsRes.data?.forEach((item) => {
        const key = `${item.competence_year}-${String(item.competence_month).padStart(2, "0")}`;
        if (totalsByMonth[key]) {
          totalsByMonth[key].houseCollective += Number(item.amount);
        }
      });

      return lastMonths.map(date => {
        const key = format(date, "yyyy-MM");
        const personal = Number(totalsByMonth[key].personal.toFixed(2));
        const myCollective = Number(totalsByMonth[key].myCollective.toFixed(2));
        const houseCollective = Number(totalsByMonth[key].houseCollective.toFixed(2));
        return {
          monthLabel: format(date, "MMM/yy", { locale: ptBR }),
          totalCasa: houseCollective,
          meuRateio: myCollective,
          meusGastos: personal,
          totalPessoal: Number((personal + myCollective).toFixed(2)),
        };
      });
    },
    enabled: !!user?.id && !!membership?.group_id,
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Evolução de Gastos</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Acompanhe o total da casa, sua parte no rateio e seus gastos individuais.
          </p>
        </div>
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
                <Tooltip
                  formatter={(value: number) => `R$ ${value.toFixed(2)}`}
                  contentStyle={{
                    borderRadius: "0.5rem",
                    borderColor: "hsl(var(--border))",
                    backgroundColor: "hsl(var(--background))",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                <Line type="monotone" dataKey="totalCasa" name="Total Casa (Referência)" stroke="#64748b" strokeWidth={2} strokeDasharray="6 4" dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="meuRateio" name="Meu Rateio" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="meusGastos" name="Meus Gastos (Individuais)" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="totalPessoal" name="Total Pessoal (Individual + Rateio)" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
