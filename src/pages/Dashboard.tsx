import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Receipt, TrendingUp, AlertTriangle, Download, Package, DollarSign, Upload, Loader2, ListChecks, User, CheckCircle2, CreditCard } from "lucide-react";
import { format, subMonths, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";

const CATEGORY_LABELS: Record<string, string> = {
  rent: "Aluguel", utilities: "Contas", groceries: "Mercado", cleaning: "Limpeza",
  maintenance: "Manutenção", internet: "Internet", other: "Outros",
};
const COLORS = ["#0f172a", "#0d9488", "#f59e0b", "#ef4444", "#8b5cf6", "#200640"];

export default function Dashboard() {
  const { profile, membership, isAdmin, user } = useAuth();
  const queryClient = useQueryClient();

  // Payment State (Rateio)
  const [payRateioOpen, setPayRateioOpen] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  // Group Stats
  const { data: monthExpenses } = useQuery({
    queryKey: ["month-expenses", membership?.group_id],
    queryFn: async () => {
      const now = new Date();
      const startOfM = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const { data } = await supabase
        .from("expenses")
        .select("amount")
        .eq("group_id", membership!.group_id)
        .gte("created_at", startOfM);
      return (data ?? []).reduce((sum, e) => sum + Number(e.amount), 0);
    },
    enabled: !!membership?.group_id,
  });

  // User Splits (Pending Collective)
  const { data: pendingSplits } = useQuery({
    queryKey: ["my-pending-splits", membership?.group_id, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expense_splits")
        .select("id, amount, status, expense_id, expenses:expense_id(title, group_id, expense_type)")
        .eq("user_id", user!.id)
        .eq("status", "pending");
      if (error) throw error;
      return (data ?? []).filter((s: any) => s.expenses?.group_id === membership!.group_id);
    },
    enabled: !!membership?.group_id && !!user?.id,
  });

  // User Installments (Credit Cards - This Month)
  const { data: currentInstallments = [] } = useQuery({
    queryKey: ["my-installments-month", user?.id],
    queryFn: async () => {
      const now = new Date();
      const { data } = await supabase
        .from("expense_installments" as any)
        .select("*, expenses(title)")
        .eq("user_id", user!.id)
        .eq("bill_month", now.getMonth() + 1)
        .eq("bill_year", now.getFullYear());
      return (data as any[]) ?? [];
    },
    enabled: !!user,
  });

  const { data: recentExpenses } = useQuery({
    queryKey: ["recent-expenses", membership?.group_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("expenses")
        .select("id, title, amount, category, created_at, expense_type")
        .eq("group_id", membership!.group_id)
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
    enabled: !!membership?.group_id,
  });

  // Split calculations
  const collectivePending = (pendingSplits ?? []).filter((s: any) => s.expenses?.expense_type === "collective");
  const totalCollective = collectivePending.reduce((sum, s: any) => sum + Number(s.amount), 0);
  const totalInstallments = currentInstallments.reduce((sum, i) => sum + Number(i.amount), 0);

  const handlePayRateio = async () => {
    if (!receiptFile) {
      toast({ title: "Erro", description: "Comprovante é obrigatório.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const ext = receiptFile.name.split(".").pop();
      const path = `${user!.id}/${Date.now()}_rateio.${ext}`;
      const { error: upErr } = await supabase.storage.from("receipts").upload(path, receiptFile);
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("receipts").getPublicUrl(path);

      const { error } = await supabase.from("payments").insert({
        group_id: membership!.group_id,
        expense_split_id: null,
        paid_by: user!.id,
        amount: totalCollective,
        receipt_url: urlData.publicUrl,
        notes: `Pagamento de Rateio - ${format(new Date(), "MMMM/yyyy", { locale: ptBR })}`
      });
      if (error) throw error;

      toast({ title: "Pagamento enviado!", description: "Aguardando confirmação." });
      queryClient.invalidateQueries({ queryKey: ["my-pending-splits"] });
      setPayRateioOpen(false);
      setReceiptFile(null);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif">Olá, {profile?.full_name?.split(" ")[0]}</h1>
          <p className="text-muted-foreground mt-1">{membership?.group_name}</p>
        </div>
      </div>

      {/* Primary Financial Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Rateio (Group Debt) */}
        <Card className={totalCollective > 0 ? "border-destructive/50 bg-destructive/5" : ""}>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Rateio Coletivo Pendente
            </CardDescription>
            <CardTitle className="text-3xl font-serif">R$ {totalCollective.toFixed(2)}</CardTitle>
          </CardHeader>
          <CardContent>
            {totalCollective > 0 ? (
              <Button size="sm" className="w-full mt-2 gap-2" onClick={() => setPayRateioOpen(true)}>
                <DollarSign className="h-4 w-4" /> Pagar Agora
              </Button>
            ) : (
              <p className="text-xs text-success flex items-center gap-1 mt-1">
                <CheckCircle2 className="h-3 w-3" /> Você está em dia com o grupo.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Credit Cards (Personal Bill) */}
        <Card className="bg-primary text-primary-foreground">
          <CardHeader className="pb-2">
            <CardDescription className="text-primary-foreground/70 flex items-center gap-2">
              <CreditCard className="h-4 w-4" /> Minha Fatura (Mês Atual)
            </CardDescription>
            <CardTitle className="text-3xl font-serif">R$ {totalInstallments.toFixed(2)}</CardTitle>
          </CardHeader>
          <CardContent>
            <Link to="/personal/bills" className="text-xs text-primary-foreground/60 hover:underline flex items-center gap-1">
              Ver detalhamento das faturas <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>

        {/* Group Overview */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Receipt className="h-4 w-4" /> Despesas da República
            </CardDescription>
            <CardTitle className="text-3xl font-serif">R$ {(monthExpenses ?? 0).toFixed(2)}</CardTitle>
          </CardHeader>
          <CardContent>
             <p className="text-xs text-muted-foreground mt-1">Total registrado este mês.</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Activity */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-serif">Últimas Despesas</CardTitle>
            <Link to="/expenses" className="text-sm text-primary hover:underline">Ver todas</Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentExpenses?.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">Nenhuma despesa recente.</p>
              ) : (
                recentExpenses?.map((e) => (
                  <div key={e.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{e.title}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(e.created_at), "dd/MM/yyyy")}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">R$ {Number(e.amount).toFixed(2)}</p>
                      <Badge variant={e.expense_type === 'collective' ? 'default' : 'secondary'} className="text-[10px] h-4">
                        {e.expense_type === 'collective' ? 'Coletiva' : 'Individual'}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Inventory Quick Alert */}
        <InventoryAlert />
      </div>

      {/* Pay Rateio Dialog */}
      <Dialog open={payRateioOpen} onOpenChange={setPayRateioOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Pagar Rateio Coletivo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="p-4 bg-muted/50 rounded-lg text-center">
              <p className="text-sm text-muted-foreground">Total a pagar ao administrador</p>
              <p className="text-3xl font-bold font-serif text-primary mt-1">R$ {totalCollective.toFixed(2)}</p>
            </div>
            <div className="space-y-2">
              <Label>Comprovante *</Label>
              <Input type="file" accept="image/*,.pdf" onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPayRateioOpen(false)}>Cancelar</Button>
              <Button onClick={handlePayRateio} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />} 
                Enviar Pagamento
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InventoryAlert() {
  const { membership } = useAuth();
  const { data: lowStockCount } = useQuery({
    queryKey: ["low-stock-count", membership?.group_id],
    queryFn: async () => {
      const { data } = await supabase.from("inventory_items").select("id, quantity, min_quantity").eq("group_id", membership!.group_id);
      return (data ?? []).filter((i) => Number(i.quantity) <= Number(i.min_quantity)).length;
    },
    enabled: !!membership?.group_id,
  });

  if (!lowStockCount) return (
    <Card className="flex flex-col justify-center items-center py-8 text-muted-foreground">
      <Package className="h-8 w-8 mb-2 opacity-20" />
      <p className="text-sm">Estoque em dia.</p>
    </Card>
  );

  return (
    <Link to="/inventory">
      <Card className="border-warning/50 bg-warning/5 cursor-pointer hover:border-warning transition-colors h-full flex flex-col justify-center">
        <CardContent className="flex items-center gap-4 py-6">
          <div className="h-12 w-12 rounded-full bg-warning/20 flex items-center justify-center text-warning">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-lg font-bold text-warning-foreground">{lowStockCount} itens acabando</p>
            <p className="text-sm text-muted-foreground">Clique para ver o estoque.</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

const ArrowRight = ({ className }: { className?: string }) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>;