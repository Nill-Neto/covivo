import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { subMonths, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
    queryKey: ["expenses-evolution-v4", user?.id, membership?.group_id, monthsCount, currentDate.toISOString()],
    queryFn: async () => {
      if (!user?.id || !membership?.group_id) return [];

      const competenceKeys = lastMonths.map(date => format(date, "yyyy-MM"));
      const billMonthFilters = lastMonths
        .map(date => `and(bill_year.eq.${date.getFullYear()},bill_month.eq.${date.getMonth() + 1})`)
        .join(',');

      const [
        personalCashRes,
        personalInstallmentsRes,
        individualGroupInstallmentsRes,
        collectiveExpensesWithSplitsRes,
      ] = await Promise.all([
        supabase
          .from("expenses")
          .select("amount, competence_key")
          .eq("created_by", user.id)
          .eq("expense_type", "individual")
          .neq("payment_method", "credit_card")
          .in("competence_key", competenceKeys),
        supabase
          .from("personal_expense_installments")
          .select("amount, bill_year, bill_month")
          .eq("user_id", user.id)
          .or(billMonthFilters),
        supabase
          .from("expense_installments")
          .select("amount, bill_year, bill_month, expenses!inner(group_id, expense_type)")
          .eq("user_id", user.id)
          .eq("expenses.group_id", membership.group_id)
          .eq("expenses.expense_type", "individual")
          .or(billMonthFilters),
        supabase
          .from("expenses")
          .select("amount, competence_key, expense_splits(user_id, amount)")
          .eq("group_id", membership.group_id)
          .eq("expense_type", "collective")
          .in("competence_key", competenceKeys),
      ]);

      if (personalCashRes.error) throw personalCashRes.error;
      if (personalInstallmentsRes.error) throw personalInstallmentsRes.error;
      if (individualGroupInstallmentsRes.error) throw individualGroupInstallmentsRes.error;
      if (collectiveExpensesWithSplitsRes.error) throw collectiveExpensesWithSplitsRes.error;

      const totalsByCompetence: Record<string, { 
        meusGastosIndividuais: number; 
        meuRateio: number;
        totalCasa: number;
      }> = {};

      lastMonths.forEach(date => {
        const key = format(date, "yyyy-MM");
        totalsByCompetence[key] = { meusGastosIndividuais: 0, meuRateio: 0, totalCasa: 0 };
      });

      personalCashRes.data?.forEach(expense => {
        if (totalsByCompetence[expense.competence_key]) {
          totalsByCompetence[expense.competence_key].meusGastosIndividuais += expense.amount;
        }
      });

      personalInstallmentsRes.data?.forEach(inst => {
        const key = `${inst.bill_year}-${String(inst.bill_month).padStart(2, '0')}`;
        if (totalsByCompetence[key]) {
          totalsByCompetence[key].meusGastosIndividuais += inst.amount;
        }
      });

      individualGroupInstallmentsRes.data?.forEach(inst => {
        const key = `${inst.bill_year}-${String(inst.bill_month).padStart(2, '0')}`;
        if (totalsByCompetence[key]) {
          totalsByCompetence[key].meusGastosIndividuais += inst.amount;
        }
      });

      collectiveExpensesWithSplitsRes.data?.forEach(exp => {
        const key = exp.competence_key;
        if (totalsByCompetence[key]) {
          totalsByCompetence[key].totalCasa += exp.amount;
          const mySplit = exp.expense_splits.find(s => s.user_id === user.id);
          if (mySplit) {
            totalsByCompetence[key].meuRateio += mySplit.amount;
          }
        }
      });

      return lastMonths.map(date => {
        const key = format(date, "yyyy-MM");
        const { meusGastosIndividuais, meuRateio, totalCasa } = totalsByCompetence[key];
        const totalPessoal = meusGastosIndividuais + meuRateio;
        
        return {
          monthLabel: format(date, "MMM/yy", { locale: ptBR }),
          meusGastosIndividuais: Number(meusGastosIndividuais.toFixed(2)),
          meuRateio: Number(meuRateio.toFixed(2)),
          totalPessoal: Number(totalPessoal.toFixed(2)),
          totalCasa: Number(totalCasa.toFixed(2)),
        };
      });
    },
    enabled: !!user?.id && !!membership?.group_id,
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Evolução de Gastos</CardTitle>
          <CardDescription className="text-xs text-muted-foreground mt-1 max-w-md">
            Acompanhe o total da casa, a sua parte no rateio e seus gastos individuais.
          </CardDescription>
        </div>
        <Select value={String(monthsCount)} onValueChange={(v) => setMonthsCount(Number(v) as 6 | 12)}>
          <SelectTrigger className="w-[130px] h-8 text-xs shrink-0">
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
                <Line type="monotone" dataKey="totalCasa" name="Total Casa (Referência)" stroke="hsl(var(--muted-foreground))" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="meuRateio" name="Meu Rateio" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="meusGastosIndividuais" name="Meus Gastos (Individuais)" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="totalPessoal" name="Total Pessoal (Individual + Rateio)" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}