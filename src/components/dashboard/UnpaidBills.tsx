import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HandCoins, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import type { Tables } from "@/integrations/supabase/types";

type ExpenseRow = Tables<"expenses"> & {
  expense_splits: Tables<"expense_splits">[];
};

interface UnpaidBillsProps {
  onRegisterPayment: (expense: ExpenseRow) => void;
}

export function UnpaidBills({ onRegisterPayment }: UnpaidBillsProps) {
  const { user, membership } = useAuth();
  const navigate = useNavigate();

  const { data: unpaidBills, isLoading } = useQuery({
    queryKey: ["unpaid-bills", membership?.group_id],
    queryFn: async () => {
      if (!membership?.group_id || !user?.id) return [];
      const { data, error } = await supabase
        .from("expenses")
        .select("*, expense_splits(*)")
        .eq("group_id", membership.group_id)
        .eq("paid_to_provider", false);

      if (error) throw error;
      return data as ExpenseRow[];
    },
    enabled: !!membership?.group_id && !!user?.id,
  });

  if (isLoading || !unpaidBills || unpaidBills.length === 0) {
    return null; // Don't render anything if there are no unpaid bills or it's loading
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
          <AlertCircle className="h-5 w-5" />
          Contas a Vencer
        </CardTitle>
        <CardDescription>
          Estas despesas foram lançadas mas ainda não foram pagas a um fornecedor. Pague a conta e clique em "Eu Paguei" para gerar as cobranças.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {unpaidBills.map((bill) => {
          const mySplit = bill.expense_splits.find(s => s.user_id === user?.id);
          const myShare = mySplit ? mySplit.amount : 0;

          return (
            <div 
              key={bill.id} 
              className="flex items-center justify-between rounded-lg border bg-background p-3 cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => navigate(`/expenses#${bill.id}`)}
            >
              <div className="space-y-1">
                <p className="font-medium">{bill.title}</p>
                <p className="text-sm text-muted-foreground">
                  Sua parte: <span className="font-semibold">R$ {Number(myShare).toFixed(2)}</span> de R$ {Number(bill.amount).toFixed(2)}
                </p>
                {bill.due_date && (
                   <p className="text-xs text-muted-foreground">
                     Vencimento: {format(new Date(bill.due_date), "dd 'de' MMMM", { locale: ptBR })}
                   </p>
                )}
              </div>
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onRegisterPayment(bill);
                }}
                className="gap-2"
              >
                <HandCoins className="h-4 w-4" />
                Eu Paguei
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}