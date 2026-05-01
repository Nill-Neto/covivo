import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowUpRight, ArrowDownLeft, Users } from "lucide-react";
import type { MyP2PBalance } from "@/types/dashboard";

interface P2PBalancesProps {
  balances: MyP2PBalance[];
}

export function P2PBalances({ balances }: P2PBalancesProps) {
  if (!balances || balances.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Balanço P2P
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Seu balanço com outros membros está zerado.
          </p>
        </CardContent>
      </Card>
    );
  }

  const debts = balances.filter(b => b.net_balance < 0).sort((a, b) => a.net_balance - b.net_balance);
  const credits = balances.filter(b => b.net_balance > 0).sort((a, b) => b.net_balance - a.net_balance);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Balanço P2P
        </CardTitle>
        <CardDescription>Resumo de quem deve para quem no seu grupo.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 md:grid-cols-2">
        <div>
          <h3 className="text-sm font-medium text-destructive flex items-center gap-2 mb-3">
            <ArrowUpRight className="h-4 w-4" />
            Você deve para
          </h3>
          <div className="space-y-3">
            {debts.length > 0 ? (
              debts.map(debt => (
                <BalanceItem key={debt.other_user_id} user={debt} type="debt" />
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Ninguém para quem você deva.</p>
            )}
          </div>
        </div>
        <div>
          <h3 className="text-sm font-medium text-success flex items-center gap-2 mb-3">
            <ArrowDownLeft className="h-4 w-4" />
            Quem te deve
          </h3>
          <div className="space-y-3">
            {credits.length > 0 ? (
              credits.map(credit => (
                <BalanceItem key={credit.other_user_id} user={credit} type="credit" />
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Ninguém te deve.</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function BalanceItem({ user, type }: { user: MyP2PBalance, type: 'debt' | 'credit' }) {
  const initials = (user.other_user_full_name || "?").charAt(0);
  const amount = Math.abs(user.net_balance);
  const colorClass = type === 'debt' ? 'text-destructive' : 'text-success';

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={user.other_user_avatar_url ?? undefined} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <span className="text-sm font-medium">{user.other_user_full_name}</span>
      </div>
      <span className={`text-sm font-semibold ${colorClass}`}>
        R$ {amount.toFixed(2)}
      </span>
    </div>
  );
}