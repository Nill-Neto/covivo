import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, Users, Clock, AlertTriangle, ArrowRight, type LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface AdminFinancialSummaryProps {
  totalExpenses: number;
  totalReceivable: number;
  pendingPaymentsCount: number;
  exMembersDebt: number;
}

interface SummaryCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  isCurrency?: boolean;
  linkTo?: string;
  linkText?: string;
  variant?: "default" | "warning" | "destructive";
}

function SummaryCard({ title, value, icon: Icon, isCurrency = true, linkTo, linkText, variant = "default" }: SummaryCardProps) {
  const variantClasses = {
    default: "text-foreground",
    warning: "text-warning",
    destructive: "text-destructive",
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className={cn("text-2xl font-bold tabular-nums", variantClasses[variant])}>
          {isCurrency ? `R$ ${value.toFixed(2)}` : value}
        </div>
        {linkTo && linkText && (
          <Button variant="link" className="p-0 h-auto text-xs mt-1 text-primary" asChild>
            <Link to={linkTo}>{linkText} <ArrowRight className="h-3 w-3 ml-1" /></Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function AdminFinancialSummary({
  totalExpenses,
  totalReceivable,
  pendingPaymentsCount,
  exMembersDebt,
}: AdminFinancialSummaryProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <SummaryCard
        title="Despesas do Ciclo"
        value={totalExpenses}
        icon={DollarSign}
        linkTo="/expenses"
        linkText="Ver despesas"
      />
      <SummaryCard
        title="A Receber (Membros Ativos)"
        value={totalReceivable}
        icon={Users}
        variant={totalReceivable > 0 ? "warning" : "default"}
      />
      <SummaryCard
        title="Pagamentos a Confirmar"
        value={pendingPaymentsCount}
        icon={Clock}
        isCurrency={false}
        linkTo="/payments"
        linkText="Confirmar pagamentos"
        variant={pendingPaymentsCount > 0 ? "warning" : "default"}
      />
      <SummaryCard
        title="Dívida de Ex-Membros"
        value={exMembersDebt}
        icon={AlertTriangle}
        variant={exMembersDebt > 0 ? "destructive" : "default"}
      />
    </div>
  );
}