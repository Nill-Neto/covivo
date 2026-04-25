import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CustomLoader } from "@/components/ui/custom-loader";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowRight, Scale } from "lucide-react";
import { useMemo } from "react";

interface DebtSimplificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  members: { profile: { id: string; full_name: string; avatar_url: string | null } | null }[];
}

type SimplifiedPayment = {
  payer_id: string;
  receiver_id: string;
  amount: number;
};

export function DebtSimplificationModal({ open, onOpenChange, groupId, members }: DebtSimplificationModalProps) {
  const { data: simplifiedPayments, isLoading, error } = useQuery({
    queryKey: ["simplify-debts", groupId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("simplify_group_debts" as any, {
        _group_id: groupId,
      });
      if (error) throw error;
      // Filter out null placeholder results
      const validData = data as SimplifiedPayment[];
      return validData.filter(p => p.payer_id && p.receiver_id && p.amount > 0.01);
    },
    enabled: open, // Only run query when modal is open
  });

  const memberMap = useMemo(() => new Map(
    members.map(m => m.profile ? [m.profile.id, m.profile] : null).filter(Boolean) as [string, { id: string; full_name: string; avatar_url: string | null }][]
  ), [members]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" />
            Pagamentos Otimizados
          </DialogTitle>
          <DialogDescription>
            Calculamos o menor número de transferências para quitar todas as dívidas do grupo. Realize os pagamentos abaixo.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-3">
          {isLoading && (
            <div className="flex justify-center items-center h-24">
              <CustomLoader />
            </div>
          )}
          {error && <p className="text-destructive text-sm">Erro ao calcular pagamentos.</p>}
          {!isLoading && !error && (
            simplifiedPayments && simplifiedPayments.length > 0 ? (
              simplifiedPayments.map((payment, index) => {
                const payer = memberMap.get(payment.payer_id);
                const receiver = memberMap.get(payment.receiver_id);
                if (!payer || !receiver) return null;

                return (
                  <div key={index} className="flex items-center justify-between gap-2 p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3 font-medium">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={payer.avatar_url ?? undefined} />
                        <AvatarFallback>{payer.full_name?.charAt(0) ?? '?'}</AvatarFallback>
                      </Avatar>
                      <span>{payer.full_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <ArrowRight className="h-4 w-4 text-muted-foreground"/>
                        <span className="text-lg font-bold text-primary">R$ {payment.amount.toFixed(2)}</span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground"/>
                    </div>
                    <div className="flex items-center gap-3 font-medium">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={receiver.avatar_url ?? undefined} />
                        <AvatarFallback>{receiver.full_name?.charAt(0) ?? '?'}</AvatarFallback>
                      </Avatar>
                      <span>{receiver.full_name}</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-center text-sm text-muted-foreground py-8">
                Todas as dívidas estão zeradas ou se anulam. Nenhum pagamento é necessário!
              </p>
            )
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}