import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CustomLoader } from "@/components/ui/custom-loader";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { MyP2PBalance } from "@/types/dashboard";
import type { User } from "@supabase/supabase-js";

interface P2PBalanceDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUser: User | null;
  otherUser: MyP2PBalance | null;
}

export function P2PBalanceDetailsDialog({ open, onOpenChange, currentUser, otherUser }: P2PBalanceDetailsDialogProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['p2p-details', currentUser?.id, otherUser?.other_user_id],
    queryFn: async () => {
      if (!currentUser || !otherUser) return null;

      const { data: debts, error: debtsError } = await supabase
        .from('expense_splits')
        .select('id, amount, expenses(title, purchase_date)')
        .eq('user_id', currentUser.id)
        .eq('credor_user_id', otherUser.other_user_id)
        .eq('status', 'pending');
      if (debtsError) throw debtsError;

      const { data: credits, error: creditsError } = await supabase
        .from('expense_splits')
        .select('id, amount, expenses(title, purchase_date)')
        .eq('user_id', otherUser.other_user_id)
        .eq('credor_user_id', currentUser.id)
        .eq('status', 'pending');
      if (creditsError) throw creditsError;

      return { debts, credits };
    },
    enabled: open && !!currentUser && !!otherUser,
  });

  const totalDebt = data?.debts?.reduce((sum, item) => sum + item.amount, 0) ?? 0;
  const totalCredit = data?.credits?.reduce((sum, item) => sum + item.amount, 0) ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 gap-0 flex flex-col max-h-[85vh]">
        <DialogHeader className="px-5 pt-5 pb-4 shrink-0 border-b">
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarImage src={otherUser?.other_user_avatar_url ?? undefined} />
              <AvatarFallback>{otherUser?.other_user_full_name?.charAt(0) ?? '?'}</AvatarFallback>
            </Avatar>
            <span>Balanço com {otherUser?.other_user_full_name}</span>
          </DialogTitle>
          <DialogDescription>
            Saldo líquido: <span className={otherUser && otherUser.net_balance < 0 ? 'text-destructive' : 'text-success'}>R$ {otherUser?.net_balance.toFixed(2)}</span>
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1">
          <div className="p-5 space-y-6">
            {isLoading ? (
              <div className="flex justify-center items-center h-24">
                <CustomLoader />
              </div>
            ) : error ? (
              <p className="text-destructive text-sm">Erro ao carregar detalhes.</p>
            ) : (
              <>
                <div>
                  <h3 className="text-sm font-medium text-destructive flex items-center gap-2 mb-3">
                    <ArrowUpRight className="h-4 w-4" />
                    Você deve para {otherUser?.other_user_full_name} (R$ {totalDebt.toFixed(2)})
                  </h3>
                  <div className="space-y-2">
                    {data?.debts && data.debts.length > 0 ? (
                      data.debts.map((item: any) => <DetailItem key={item.id} item={item} />)
                    ) : (
                      <p className="text-sm text-muted-foreground">Nenhuma dívida com esta pessoa.</p>
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-success flex items-center gap-2 mb-3">
                    <ArrowDownLeft className="h-4 w-4" />
                    {otherUser?.other_user_full_name} te deve (R$ {totalCredit.toFixed(2)})
                  </h3>
                  <div className="space-y-2">
                    {data?.credits && data.credits.length > 0 ? (
                      data.credits.map((item: any) => <DetailItem key={item.id} item={item} />)
                    ) : (
                      <p className="text-sm text-muted-foreground">Nenhum crédito com esta pessoa.</p>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function DetailItem({ item }: { item: { amount: number, expenses: { title: string | null, purchase_date: string | null } | null } }) {
  return (
    <div className="flex items-center justify-between text-sm p-2 rounded-md bg-muted/50">
      <div>
        <p className="font-medium">{item.expenses?.title || "Despesa sem título"}</p>
        <p className="text-xs text-muted-foreground">
          {item.expenses?.purchase_date ? format(new Date(item.expenses.purchase_date + 'T00:00:00'), "dd/MM/yyyy", { locale: ptBR }) : 'Data indisponível'}
        </p>
      </div>
      <span className="font-semibold">R$ {item.amount.toFixed(2)}</span>
    </div>
  );
}