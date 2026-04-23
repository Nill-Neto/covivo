import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { Plus, RefreshCw, Calendar, Edit, Trash2, Users, User } from "lucide-react";
import { CustomLoader } from "@/components/ui/custom-loader";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PageHero } from "@/components/layout/PageHero";
import { ScrollRevealGroup } from "@/components/ui/scroll-reveal";

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

export default function RecurringExpenses() {
  const { membership, isAdmin, user } = useAuth();
  const queryClient = useQueryClient();
  
  // State for Create/Edit Dialog
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form Fields
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("other");
  const [customCategory, setCustomCategory] = useState("");
  const [frequency, setFrequency] = useState("monthly");
  const [dayOfMonth, setDayOfMonth] = useState("1");
  const [description, setDescription] = useState("");
  const [expenseType, setExpenseType] = useState<"collective" | "individual">(isAdmin ? "collective" : "individual");
  const [saving, setSaving] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [creditCardId, setCreditCardId] = useState<string>("none");
  const [payerUserId, setPayerUserId] = useState<string>("me");
  const [splitMode, setSplitMode] = useState<"all" | "manual">("all");
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([]);

  // State for Generate Now dialog
  const [generateConfig, setGenerateConfig] = useState<{ open: boolean; rec: any | null; amount: string }>({
    open: false,
    rec: null,
    amount: "",
  });

  useEffect(() => {
    if (category !== "other") {
      setCustomCategory("");
    }
  }, [category]);

  const { data: cards = [] } = useQuery({
    queryKey: ["credit-cards", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("credit_cards").select("*").eq("user_id", user!.id);
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: activeMembers = [] } = useQuery({
    queryKey: ["expense-active-members", membership?.group_id],
    queryFn: async () => {
      const [{ data: members }, { data: profiles }] = await Promise.all([
        supabase
          .from("group_members")
          .select("user_id")
          .eq("group_id", membership!.group_id)
          .eq("active", true),
        supabase.rpc("get_group_member_public_profiles", {
          _group_id: membership!.group_id,
        }),
      ]);

      const profileMap = new Map((profiles ?? []).map((profile: any) => [profile.id, profile]));
      return (members ?? []).map((member) => {
        const profile = profileMap.get(member.user_id);
        const label = profile?.full_name || "Morador";
        return {
          user_id: member.user_id,
          label,
        };
      });
    },
    enabled: !!membership?.group_id,
  });

  const activeMemberIds = useMemo(() => activeMembers.map((member) => member.user_id), [activeMembers]);
  
  const participantOptions = useMemo(() => {
    return activeMembers.map((member) => ({
      id: member.user_id,
      name: member.label,
    }));
  }, [activeMembers]);

  useEffect(() => {
    if (!editingId && splitMode === "all") {
      setSelectedParticipantIds(activeMemberIds);
    }
  }, [activeMemberIds, editingId, splitMode]);

  const { data: recurring, isLoading } = useQuery({
    queryKey: ["recurring", membership?.group_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recurring_expenses")
        .select("*")
        .eq("group_id", membership!.group_id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!membership?.group_id,
  });

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setAmount("");
    setCategory("other");
    setCustomCategory("");
    setFrequency("monthly");
    setDayOfMonth("1");
    setDescription("");
    setExpenseType(isAdmin ? "collective" : "individual");
    setPaymentMethod("cash");
    setCreditCardId("none");
    setPayerUserId("me");
    setSplitMode("all");
    setSelectedParticipantIds(activeMemberIds);
  };

  const handleOpenEdit = (rec: any) => {
    setEditingId(rec.id);
    setTitle(rec.title);
    setAmount(String(rec.amount));
    
    const isStandardCat = CATEGORIES.some(c => c.value === rec.category);
    if (isStandardCat) {
      setCategory(rec.category);
      setCustomCategory("");
    } else {
      setCategory("other");
      setCustomCategory(rec.category || "");
    }
    
    setFrequency(rec.frequency);
    setDayOfMonth(String(rec.day_of_month || 1));
    setDescription(rec.description || "");
    setExpenseType(rec.expense_type || "collective");
    
    setPaymentMethod(rec.payment_method || "cash");
    setCreditCardId(rec.credit_card_id || "none");
    
    if (rec.participant_user_ids && rec.participant_user_ids.length > 0) {
      setSplitMode("manual");
      setSelectedParticipantIds(rec.participant_user_ids);
    } else {
      setSplitMode("all");
      setSelectedParticipantIds(activeMemberIds);
    }
    
    setOpen(true);
  };

  const toggleParticipant = (participantId: string) => {
    setSelectedParticipantIds((prev) =>
      prev.includes(participantId) ? prev.filter((id) => id !== participantId) : [...prev, participantId],
    );
  };

  const handleSave = async () => {
    if (!title.trim() || !amount || parseFloat(amount) <= 0) {
      toast({ title: "Erro", description: "Preencha título e valor.", variant: "destructive" });
      return;
    }

    if (paymentMethod === "credit_card" && (creditCardId === "none" || !creditCardId)) {
      toast({ title: "Erro", description: "Selecione um cartão de crédito.", variant: "destructive" });
      return;
    }

    if (expenseType === "collective" && splitMode === "manual" && selectedParticipantIds.length === 0) {
      toast({ title: "Erro", description: "Selecione pelo menos um participante.", variant: "destructive" });
      return;
    }

    const categoryToSend = category === "other" ? customCategory.trim() : category;
    const finalCreditCardId = creditCardId === "none" ? null : creditCardId;
    const effectiveParticipantIds = expenseType === "individual" 
      ? (user?.id ? [user.id] : []) 
      : (splitMode === "all" ? activeMemberIds : selectedParticipantIds);

    setSaving(true);
    try {
      const day = parseInt(dayOfMonth);
      
      const basePayload = {
        group_id: membership!.group_id,
        created_by: user!.id,
        title: title.trim(),
        description: description.trim() || null,
        amount: parseFloat(amount),
        category: categoryToSend,
        frequency,
        day_of_month: day,
        expense_type: expenseType,
        payment_method: paymentMethod,
        credit_card_id: finalCreditCardId,
        participant_user_ids: expenseType === "collective" && splitMode === "manual" ? effectiveParticipantIds : null,
      } as any;

      if (editingId) {
        const { error } = await supabase.from("recurring_expenses").update(basePayload).eq("id", editingId);
        if (error) throw error;
        toast({ title: "Recorrência atualizada!" });
      } else {
        // Calculate next due date only for new items
        const now = new Date();
        const nextDue = new Date(now.getFullYear(), now.getMonth(), day);
        if (nextDue <= now) {
          nextDue.setMonth(nextDue.getMonth() + 1);
        }

        const { error } = await supabase.from("recurring_expenses").insert({
          ...basePayload,
          next_due_date: nextDue.toISOString().split("T")[0]
        });
        if (error) throw error;
        toast({ title: "Recorrência criada!", description: `"${title}" será gerada automaticamente.` });
      }

      queryClient.invalidateQueries({ queryKey: ["recurring"] });
      setOpen(false);
      resetForm();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const deleteRecurring = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("recurring_expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring"] });
      toast({ title: "Recorrência excluída." });
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const toggleActive = async (id: string, active: boolean) => {
    const { error } = await supabase.from("recurring_expenses").update({ active: !active }).eq("id", id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      queryClient.invalidateQueries({ queryKey: ["recurring"] });
    }
  };

  const generateMutation = useMutation({
    mutationFn: async ({ rec, finalAmount }: { rec: any, finalAmount: number }) => {
      const { error } = await supabase.rpc("create_expense_with_splits", {
        _group_id: rec.group_id,
        _title: rec.title,
        _description: rec.description || null,
        _amount: finalAmount,
        _category: rec.category,
        _expense_type: rec.expense_type || "collective",
        _due_date: rec.next_due_date || null,
        _receipt_url: null,
        _recurring_expense_id: rec.id,
        _target_user_id: rec.expense_type === "individual" ? rec.created_by : null,
        _payment_method: rec.payment_method || "cash",
        _credit_card_id: rec.credit_card_id || null,
        _installments: 1,
        _purchase_date: rec.next_due_date || null,
        _participant_user_ids: rec.participant_user_ids || null,
      } as any);

      if (error) throw error;

      // Advance next_due_date
      const next = new Date(rec.next_due_date + "T12:00:00");
      if (rec.frequency === "monthly") next.setMonth(next.getMonth() + 1);
      else if (rec.frequency === "weekly") next.setDate(next.getDate() + 7);
      else next.setFullYear(next.getFullYear() + 1);

      const { error: updateError } = await supabase.from("recurring_expenses").update({
        next_due_date: next.toISOString().split("T")[0],
        last_generated_at: new Date().toISOString(),
      }).eq("id", rec.id);

      if (updateError) throw updateError;
    },
    onSuccess: (_, { rec }) => {
      toast({ title: "Despesa gerada!", description: `"${rec.title}" criada com sucesso.` });
      queryClient.invalidateQueries({ queryKey: ["recurring"] });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      setGenerateConfig({ open: false, rec: null, amount: "" });
    },
    onError: (err: any) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  });

  const generateNow = () => {
    const { rec, amount: genAmount } = generateConfig;
    if (!rec) return;

    // Converte de vírgula para ponto caso o usuário digite com vírgula
    const finalAmount = parseFloat(String(genAmount).replace(",", "."));
    if (isNaN(finalAmount) || finalAmount <= 0) {
      toast({ title: "Erro", description: "Valor inválido.", variant: "destructive" });
      return;
    }

    generateMutation.mutate({ rec, finalAmount });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <CustomLoader className="h-6 w-6 text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHero
        title="Recorrências"
        subtitle="Despesas automáticas mensais"
        tone="primary"
        icon={<RefreshCw className="h-4 w-4" />}
        actions={
        <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); setOpen(v); }}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" /> Nova Recorrência</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg p-0 gap-0 flex flex-col overflow-hidden max-h-[90vh]">
              <DialogHeader className="px-6 pt-6 pb-4 shrink-0 border-b bg-background">
                <DialogTitle className="font-serif">
                  {editingId ? "Editar Recorrência" : "Nova Despesa Recorrente"}
                </DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                <div className="space-y-2">
                  <Label>Título</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Aluguel" maxLength={200} />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Valor (R$)</Label>
                    <Input type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" />
                  </div>
                  <div className="space-y-2">
                    <Label>Categoria</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => (<SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {category === "other" && (
                  <div className="space-y-2">
                    <Label>Nome da Categoria</Label>
                    <Input placeholder="Ex: Farmácia" value={customCategory} onChange={(e) => setCustomCategory(e.target.value)} />
                  </div>
                )}

                <div className="rounded-lg border bg-muted/20 p-3 space-y-3">
                  <Label className="text-base font-medium">1. Tipo</Label>
                  <Select value={expenseType} onValueChange={(v) => setExpenseType(v as any)} disabled={!!editingId}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {isAdmin && (
                        <SelectItem value="collective">
                          <div className="flex items-center gap-2"><Users className="h-4 w-4" /> Coletiva</div>
                        </SelectItem>
                      )}
                      <SelectItem value="individual">
                        <div className="flex items-center gap-2"><User className="h-4 w-4" /> Individual</div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="rounded-lg border bg-muted/20 p-3 space-y-3">
                  <Label className="text-base font-medium">2. Pagamento e Participantes</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Forma de pagamento</Label>
                      <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {PAYMENT_METHODS.map((p) => (
                            <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {paymentMethod === "credit_card" ? (
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Cartão</Label>
                        <Select value={creditCardId} onValueChange={setCreditCardId}>
                          <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                          <SelectContent>
                            {cards.length === 0 && <SelectItem value="none" disabled>Nenhum cartão</SelectItem>}
                            {cards.map((c: any) => (
                              <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Quem paga?</Label>
                        <Select value={payerUserId} onValueChange={setPayerUserId}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="me">Você</SelectItem>
                            {participantOptions.map((participant) => (
                              <SelectItem key={participant.id} value={participant.id}>
                                {participant.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                  
                  {expenseType === "collective" && (
                    <div className="space-y-3 pt-3 border-t">
                      <Label className="text-xs text-muted-foreground">Participantes do rateio</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Button type="button" variant={splitMode === "all" ? "default" : "outline"} onClick={() => setSplitMode("all")} size="sm">
                          Todos
                        </Button>
                        <Button type="button" variant={splitMode === "manual" ? "default" : "outline"} onClick={() => setSplitMode("manual")} size="sm">
                          Seleção manual
                        </Button>
                      </div>
                      {splitMode === "manual" && (
                        <div className="space-y-2 border rounded-md p-2 max-h-32 overflow-y-auto">
                          {participantOptions.map((participant) => (
                            <label key={participant.id} className="flex items-center gap-2 text-sm">
                              <Checkbox
                                checked={selectedParticipantIds.includes(participant.id)}
                                onCheckedChange={() => toggleParticipant(participant.id)}
                              />
                              <span>{participant.name}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Frequência</Label>
                    <Select value={frequency} onValueChange={setFrequency}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Semanal</SelectItem>
                        <SelectItem value="monthly">Mensal</SelectItem>
                        <SelectItem value="yearly">Anual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Dia do mês</Label>
                    <Input type="number" min="1" max="31" value={dayOfMonth} onChange={(e) => setDayOfMonth(e.target.value)} />
                  </div>
                </div>
                
                <div className="space-y-2 pt-2 border-t">
                  <Label>Descrição (opcional)</Label>
                  <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detalhes adicionais" />
                </div>

              </div>
              <div className="px-6 pb-6 pt-4 shrink-0 border-t bg-background">
                <Button onClick={handleSave} disabled={saving} className="w-full">
                  {saving ? <CustomLoader className="h-4 w-4 mr-2" /> : null}
                  {editingId ? "Salvar Alterações" : "Criar Recorrência"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <Dialog open={generateConfig.open} onOpenChange={(open) => setGenerateConfig(prev => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerar despesa agora?</DialogTitle>
            <DialogDescription>
              Confirme ou edite o valor. Isso criará a despesa "{generateConfig.rec?.title}" imediatamente na aba Despesas e avançará a próxima data de vencimento.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Valor a ser gerado (R$)</Label>
              <Input 
                type="number" 
                step="0.01" 
                min="0.01" 
                value={generateConfig.amount} 
                onChange={(e) => setGenerateConfig(prev => ({ ...prev, amount: e.target.value }))} 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerateConfig(prev => ({ ...prev, open: false }))}>
              Cancelar
            </Button>
            <Button onClick={generateNow} disabled={generateMutation.isPending}>
              {generateMutation.isPending ? <CustomLoader className="h-4 w-4 mr-2" /> : null}
              Gerar Despesa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {recurring?.length === 0 && (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Nenhuma recorrência configurada.</CardContent></Card>
      )}

      <ScrollRevealGroup preset="blur-slide" className="space-y-3">
        {recurring?.map((r) => {
          const catLabel = CATEGORIES.find((c) => c.value === r.category)?.label ?? r.category;
          return (
            <Card key={r.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium">{r.title}</p>
                      <Badge variant="outline" className="text-xs">{catLabel}</Badge>
                      <Badge variant={(r as any).expense_type === "collective" ? "default" : "secondary"} className="text-xs">
                        {(r as any).expense_type === "collective" ? "Coletiva" : "Individual"}
                      </Badge>
                      <Badge variant={r.active ? "default" : "secondary"} className="text-xs">
                        {r.active ? "Ativa" : "Pausada"}
                      </Badge>
                    </div>
                    {r.description && <p className="text-xs text-muted-foreground mt-1">{r.description}</p>}
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Próximo: {format(new Date(r.next_due_date + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                  <div className="text-right shrink-0 flex flex-col items-end gap-2">
                    <p className="text-lg font-bold">R$ {Number(r.amount).toFixed(2)}</p>
                    {(isAdmin || r.created_by === user?.id) && (
                      <div className="flex items-center gap-1 mt-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleOpenEdit(r)} title="Editar">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" title="Excluir">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir recorrência?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir "{r.title}"? Novas despesas não serão geradas automaticamente.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteRecurring.mutate(r.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        <div className="w-px h-4 bg-border mx-1" />
                        
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8" 
                          title="Gerar agora"
                          onClick={() => setGenerateConfig({ open: true, rec: r, amount: String(r.amount) })}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>

                        <Switch checked={r.active} onCheckedChange={() => toggleActive(r.id, r.active)} className="ml-1" />
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </ScrollRevealGroup>
    </div>
  );
}