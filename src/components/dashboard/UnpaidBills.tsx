import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { HandCoins, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

export function UnpaidBills() {
  const { user, membership } = useAuth();
  const queryClient = useQueryClient();
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
      return data;
    },
    enabled: !!membership?.group_id && !!user?.id,
  });

  const claimPayment = useMutation({
    mutationFn: async (expenseId: string) => {
      const { error } = await supabase.rpc("claim_expense_payment", {
        _expense_id: expenseId,
        _user_id: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Despesa assumida!", description: "As dívidas foram atualizadas para os outros membros." });
      queryClient.invalidateQueries({ queryKey: ["unpaid-bills"] });
      queryClient.invalidateQueries({ queryKey: ["get_my_p2p_balances"] }); // To refresh the main balance
      queryClient.invalidateQueries({ queryKey: ["dashboard-expenses"] });
      queryClient.invalidateQueries({ queryKey: ["my-pending-splits-dashboard"] });
    },
    onError: (err: any) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
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
                  claimPayment.mutate(bill.id);
                }}
                disabled={claimPayment.isPending}
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