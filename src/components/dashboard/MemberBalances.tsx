'''
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowRight, ArrowLeft, User, AlertTriangle, Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MemberBalance {
  user_id: string;
  full_name: string;
  avatar_url: string;
  balance: number;
}

export function MemberBalances() {
  const { activeGroupId, user } = useAuth();

  const { data: balances, isLoading, error } = useQuery<MemberBalance[]>(
    ["member_balances", activeGroupId],
    async () => {
      if (!activeGroupId) return [];
      const { data, error } = await supabase.rpc("get_member_balances", {
        _group_id: activeGroupId,
      });

      if (error) {
        throw new Error(error.message);
      }
      // Filter out the current user from the list
      return data.filter((b: MemberBalance) => b.user_id !== user?.id);
    },
    {
      enabled: !!activeGroupId && !!user?.id,
    }
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Banknote className="h-5 w-5" />
            Balanço entre Membros
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted animate-pulse">
              <div className="h-10 w-10 rounded-full bg-muted-foreground/20"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 rounded bg-muted-foreground/20"></div>
                <div className="h-3 w-1/2 rounded bg-muted-foreground/20"></div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Erro ao carregar balanço
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">Não foi possível carregar os detalhes do balanço. Tente novamente mais tarde.</p>
        </CardContent>
      </Card>
    )
  }

  const relevantBalances = balances?.filter(b => Math.abs(b.balance) > 0.01);

  if (!relevantBalances || relevantBalances.length === 0) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                    <Banknote className="h-5 w-5" />
                    Balanço entre Membros
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground text-center py-4">Tudo certo por aqui! Ninguém deve a ninguém no grupo.</p>
            </CardContent>
        </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Banknote className="h-5 w-5" />
          Balanço entre Membros
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {relevantBalances.map((member) => {
          const iOwe = member.balance < 0;
          const theyOwe = member.balance > 0;
          const balanceAbs = Math.abs(member.balance);
          const initials = member.full_name?.substring(0, 2).toUpperCase() || "??";

          return (
            <div key={member.user_id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={member.avatar_url} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium text-foreground">{member.full_name}</p>
                  <div className={cn(
                    "text-sm font-semibold flex items-center gap-1",
                    iOwe ? "text-destructive" : "text-green-600"
                  )}>
                    {iOwe ? (
                      <>
                        <ArrowRight className="h-4 w-4" />
                        <span>Você deve</span>
                      </>
                    ) : (
                      <>
                        <ArrowLeft className="h-4 w-4" />
                        <span>Te deve</span>
                      </>
                    )}
                    <span>R$ {balanceAbs.toFixed(2)}</span>
                  </div>
                </div>
              </div>
              <Button variant="outline" size="sm">
                {iOwe ? "Pagar" : "Lembrar"}
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
'''