import { useEffect, useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Loader2, Plus, Calendar, Users, User, Save, Upload, Edit, Trash2, ExternalLink, CheckCircle2, DollarSign, CreditCard } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const CATEGORIES = [
  { value: "rent", label: "Aluguel" },
  { value: "utilities", label: "Contas (Luz/Água/Gás)" },
  { value: "internet", label: "Internet/TV" },
  { value: "cleaning", label: "Limpeza" },
  { value: "maintenance", label: "Manutenção" },
  { value: "groceries", label: "Mercado" },
  { value: "other", label: "Outros" },
];

const PAYMENT_METHODS = [
  { value: "cash", label: "Dinheiro" },
  { value: "pix", label: "Pix" },
  { value: "debit", label: "Débito" },
  { value: "credit_card", label: "Cartão de Crédito" },
];

export default function Expenses() {
  const { membership, isAdmin, user } = useAuth();
  const queryClient = useQueryClient();
  
  // Create/Edit Dialog State
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form State
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("other");
  const [customCategory, setCustomCategory] = useState("");
  const [expenseType, setExpenseType] = useState<"collective" | "individual">("individual");
  const [purchaseDate, setPurchaseDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [description, setDescription] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [creditCardId, setCreditCardId] = useState<string>("none");
  const [installments, setInstallments] = useState("1");

  const [saving, setSaving] = useState(false);

  // Pay Provider Dialog (Admin only)
  const [payProviderOpen, setPayProviderOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<any>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  // Queries
  const { data: expenses, isLoading } = useQuery({
    queryKey: ["expenses", membership?.group_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("*, expense_splits(id, user_id, amount, status, paid_at)")
        .eq("group_id", membership!.group_id)
        .order("purchase_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!membership?.group_id,
  });

  const { data: cards = [] } = useQuery({
    queryKey: ["credit-cards", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("credit_cards").select("*").eq("user_id", user!.id);
      return data ?? [];
    },
    enabled: !!user,
  });

  const handleSave = async () => {
    if (!title.trim() || !amount || parseFloat(amount) <= 0) {
      toast({ title: "Erro", description: "Informe título e valor válido.", variant: "destructive" });
      return;
    }

    if (category === "other" && !customCategory.trim()) {
      toast({ title: "Erro", description: "Informe o nome da categoria.", variant: "destructive" });
      return;
    }

    if (paymentMethod === "credit_card" && creditCardId === "none") {
      toast({ title: "Erro", description: "Selecione um cartão de crédito.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const finalCategory = category === "other" ? customCategory.trim() : category;
      const finalCC = paymentMethod === 'credit_card' ? creditCardId : null;

      if (editingId) {
        const { error } = await supabase.from("expenses").update({
          title: title.trim(),
          description: description.trim() || null,
          amount: parseFloat(amount),
          category: finalCategory,
          purchase_date: purchaseDate,
          payment_method: paymentMethod,
          credit_card_id: finalCC,
          installments: parseInt(installments) || 1,
        }).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.rpc("create_expense_with_splits", {
          _group_id: membership!.group_id,
          _title: title.trim(),
          _description: description.trim() || null,
          _amount: parseFloat(amount),
          _category: finalCategory,
          _expense_type: expenseType,
          _payment_method: paymentMethod,
          _credit_card_id: finalCC,
          _installments: parseInt(installments) || 1,
          _purchase_date: purchaseDate,
          _target_user_id: expenseType === 'individual' ? user?.id : null
        });
        if (error) throw error;
      }

      toast({ title: editingId ? "Atualizada!" : "Criada!" });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      setOpen(false);
      resetForm();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setAmount("");
    setCategory("other");
    setCustomCategory("");
    setExpenseType(isAdmin ? "collective" : "individual");
    setPurchaseDate(format(new Date(), "yyyy-MM-dd"));
    setDescription("");
    setPaymentMethod("cash");
    setCreditCardId("none");
    setInstallments("1");
  };

  const openEdit = (e: any) => {
    setEditingId(e.id);
    setTitle(e.title);
    setAmount(String(e.amount));
    setExpenseType(e.expense_type);
    setPurchaseDate(e.purchase_date || format(new Date(), "yyyy-MM-dd"));
    setDescription(e.description || "");
    setPaymentMethod(e.payment_method || "cash");
    setCreditCardId(e.credit_card_id || "none");
    setInstallments(String(e.installments || 1));
    
    const standard = CATEGORIES.find(c => c.value === e.category);
    if (standard) setCategory(e.category);
    else { setCategory("other"); setCustomCategory(e.category); }
    setOpen(true);
  };

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif">Despesas</h1>
          <p className="text-muted-foreground mt-1">Gerencie gastos da república e individuais.</p>
        </div>
        <Button className="gap-2" onClick={() => { resetForm(); setOpen(true); }}>
          <Plus className="h-4 w-4" /> Nova Despesa
        </Button>
      </div>

      {/* Main Dialog */}
      <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); setOpen(v); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-serif">{editingId ? "Editar Despesa" : "Nova Despesa"}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Tipo de Despesa</Label>
                <Select value={expenseType} onValueChange={(v: any) => setExpenseType(v)} disabled={!!editingId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {isAdmin && <SelectItem value="collective">Coletiva (Grupo)</SelectItem>}
                    <SelectItem value="individual">Individual (Só minha)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Data da Compra</Label>
                <Input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Título / O que você comprou?</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Supermercado mensal" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Valor Total (R$)</Label>
                <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            {category === 'other' && (
              <div className="space-y-2"><Label>Qual categoria?</Label><Input value={customCategory} onChange={(e) => setCustomCategory(e.target.value)} /></div>
            )}

            <div className="border-t pt-4 space-y-4">
              <Label className="text-base font-semibold">Como foi pago?</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">Meio de Pagamento</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PAYMENT_METHODS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {paymentMethod === 'credit_card' && (
                  <div className="space-y-2">
                    <Label className="text-xs">Qual Cartão?</Label>
                    <Select value={creditCardId} onValueChange={setCreditCardId}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {cards.length === 0 && <SelectItem value="none" disabled>Nenhum cartão salvo</SelectItem>}
                        {cards.map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {paymentMethod === 'credit_card' && (
                <div className="space-y-2">
                  <Label className="text-xs">Parcelas</Label>
                  <div className="flex items-center gap-3">
                    <Input type="number" min="1" max="36" className="w-24" value={installments} onChange={(e) => setInstallments(e.target.value)} />
                    <span className="text-sm text-muted-foreground">x de R$ {(Number(amount || 0) / (Number(installments) || 1)).toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2"><Label>Observações (opcional)</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} /></div>

            <Button className="w-full mt-4" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              {editingId ? "Salvar Alterações" : "Registrar Despesa"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="all">
        <TabsList><TabsTrigger value="all">Ver Todas</TabsTrigger><TabsTrigger value="collective">Coletivas</TabsTrigger><TabsTrigger value="mine">Individuais (Minhas)</TabsTrigger></TabsList>
        
        <TabsContent value="all" className="space-y-3 mt-4">
          {expenses?.map(e => <ExpenseCard key={e.id} expense={e} userId={user?.id} isAdmin={isAdmin} onEdit={() => openEdit(e)} />)}
        </TabsContent>
        <TabsContent value="collective" className="space-y-3 mt-4">
          {expenses?.filter(e => e.expense_type === 'collective').map(e => <ExpenseCard key={e.id} expense={e} userId={user?.id} isAdmin={isAdmin} onEdit={() => openEdit(e)} />)}
        </TabsContent>
        <TabsContent value="mine" className="space-y-3 mt-4">
          {expenses?.filter(e => e.expense_type === 'individual' && e.created_by === user?.id).map(e => <ExpenseCard key={e.id} expense={e} userId={user?.id} isAdmin={isAdmin} onEdit={() => openEdit(e)} />)}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ExpenseCard({ expense, userId, isAdmin, onEdit }: any) {
  const queryClient = useQueryClient();
  const cat = CATEGORIES.find(c => c.value === expense.category)?.label || expense.category;
  
  const handleDelete = async () => {
    if (!confirm("Excluir esta despesa?")) return;
    const { error } = await supabase.from("expenses").delete().eq("id", expense.id);
    if (!error) {
      toast({ title: "Removida." });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <p className="font-medium">{expense.title}</p>
              <Badge variant={expense.expense_type === 'collective' ? 'default' : 'secondary'} className="text-[10px] h-4">
                {expense.expense_type === 'collective' ? 'Coletiva' : 'Individual'}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {format(new Date(expense.purchase_date + "T12:00:00"), "dd/MM/yyyy")}</span>
              <span className="flex items-center gap-1"><Badge variant="outline" className="text-[10px]">{cat}</Badge></span>
              <span>{PAYMENT_METHODS.find(p => p.value === expense.payment_method)?.label || expense.payment_method}</span>
            </div>
          </div>
          <div className="text-right">
            <p className="font-bold font-serif text-lg">R$ {Number(expense.amount).toFixed(2)}</p>
            {expense.installments > 1 && <p className="text-[10px] text-muted-foreground">{expense.installments}x no cartão</p>}
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-1 pt-2 border-t">
          {(isAdmin || expense.created_by === userId) && (
            <>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}><Edit className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={handleDelete}><Trash2 className="h-4 w-4" /></Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}