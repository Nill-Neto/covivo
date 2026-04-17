import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { Plus, Check, X, Upload, Image as ImageIcon, ChevronLeft, ChevronRight, ChevronsUpDown, Settings, Trash2, CreditCard } from "lucide-react";
import { CustomLoader } from "@/components/ui/custom-loader";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { PageHero } from "@/components/layout/PageHero";
import { useCycleDates } from "@/hooks/useCycleDates";
import { getCompetenceKeyFromDate, formatCompetenceKey } from "@/lib/cycleDates";
import { useIsMobile } from "@/hooks/use-mobile";
import { Capacitor } from "@capacitor/core";

const PAYMENT_DRAFT_STORAGE_KEY = "payments:send-payment-draft";

type ReceiptDraftMetadata = {
  name: string;
  size: number;
  type: string;
};

type PaymentDraft = {
  selectedSplitIds: string[];
  amount: string;
  notes: string;
  amountTouched: boolean;
  receiptMetadata: ReceiptDraftMetadata | null;
};

export default function Payments() {
  const { membership, isAdmin, user } = useAuth();
  const queryClient = useQueryClient();
  
  const [open, setOpen] = useState(false);
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [heroCompact, setHeroCompact] = useState(false);
  
  const [selectedSplitIds, setSelectedSplitIds] = useState<string[]>([]);
  const [amount, setAmount] = useState("");
  const [amountTouched, setAmountTouched] = useState(false);
  const [notes, setNotes] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptMetadata, setReceiptMetadata] = useState<ReceiptDraftMetadata | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const hasRestoredDraftRef = useRef(false);
  const isMobile = useIsMobile();
  const isNativeRuntime = Capacitor.isNativePlatform();

  const { currentDate, cycleStart, cycleEnd, nextMonth, prevMonth, closingDay } = useCycleDates(membership?.group_id);
  const platformLabel = useMemo(() => {
    if (isNativeRuntime) return `capacitor-${Capacitor.getPlatform()}`;
    if (isMobile) return "mobile-web";
    return "desktop-web";
  }, [isMobile, isNativeRuntime]);
  const paymentDraftKey = useMemo(
    () => (user?.id && membership?.group_id ? `payment-draft:${membership.group_id}:${user.id}` : null),
    [membership?.group_id, user?.id]
  );

  const [editingPayment, setEditingPayment] = useState<any>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editCompetence, setEditCompetence] = useState("");

  const openManage = (payment: any) => {
    setEditingPayment(payment);
    setEditAmount(String(payment.amount));
    setEditNotes(payment.notes || "");
    setEditStatus(payment.status);

    const competence = payment.competence_key || getCompetenceKeyFromDate(new Date(payment.created_at), closingDay);
    setEditCompetence(competence);
  };

  const updatePayment = useMutation({
    mutationFn: async (values: { amount: string; notes: string; status: string; competence: string }) => {
      const [y, m] = values.competence.split("-").map(Number);
      const cleanAmount = values.amount.replace(",", ".");
      const amountNum = Number(cleanAmount);
      
      if (isNaN(amountNum)) throw new Error("Valor numérico inválido");

      let newDate = editingPayment.created_at;
      let newCompDate = editingPayment.competence_date;
      
      if (values.competence && values.competence !== editingPayment.competence_key) {
        // Use the 1st of the month as a base.
        // We'll set BOTH created_at and competence_date to be safe,
        // but the trigger Priority 1 will handle it via competence_key.
        const safeDate = new Date(y, m - 1, 1, 12, 0, 0);
        newDate = safeDate.toISOString();
        newCompDate = format(safeDate, "yyyy-MM-dd");
      }

      const { error } = await supabase
        .from("payments")
        .update({
          amount: amountNum,
          notes: values.notes || null,
          status: values.status,
          created_at: newDate,
          competence_date: newCompDate,
          competence_key: values.competence || editingPayment.competence_key,
          competence_year: y,
          competence_month: m,
        } as any)
        .eq("id", editingPayment.id);
      if (error) throw error;

      if ((values.status === 'confirmed' || values.status === 'rejected') && values.status !== editingPayment.status) {
        const { error: rpcError } = await supabase.rpc("confirm_payment", {
          _payment_id: editingPayment.id,
          _status: values.status,
        });
        if (rpcError) throw rpcError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      toast({ title: "Pagamento atualizado!" });
      setEditingPayment(null);
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const deletePayment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("payments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      toast({ title: "Pagamento excluído." });
      setEditingPayment(null);
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const currentCompetenceKey = formatCompetenceKey(currentDate);

  const { data: payments, isLoading } = useQuery({
    queryKey: ["payments", membership?.group_id, currentCompetenceKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("group_id", membership!.group_id)
        .or(`status.eq.pending,competence_key.eq.${currentCompetenceKey}`)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const userIds = [...new Set(data.map((p) => p.paid_by))];
      const { data: profiles } = await supabase.from("group_member_profiles").select("id, full_name").eq("group_id", membership!.group_id).in("id", userIds);
      return data.map((p) => ({
        ...p,
        payer_name: profiles?.find((pr) => pr.id === p.paid_by)?.full_name ?? "—",
      }));
    },
    enabled: !!membership?.group_id,
  });

  const { data: pendingSplits } = useQuery({
    queryKey: ["my-pending-splits", membership?.group_id, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expense_splits")
        .select("id, amount, status, expense_id, expenses:expense_id(title, group_id)")
        .eq("user_id", user!.id)
        .eq("status", "pending");
      if (error) throw error;
      return (data ?? []).filter((s: any) => s.expenses?.group_id === membership!.group_id);
    },
    enabled: !!membership?.group_id && !!user?.id,
  });

  const clearPaymentDraft = () => {
    sessionStorage.removeItem(PAYMENT_DRAFT_STORAGE_KEY);
    setSelectedSplitIds([]);
    setAmount("");
    setAmountTouched(false);
    setNotes("");
    setReceiptFile(null);
    setReceiptMetadata(null);
  };

  useEffect(() => {
    const rawDraft = sessionStorage.getItem(PAYMENT_DRAFT_STORAGE_KEY);
    if (!rawDraft) return;

    try {
      const draft = JSON.parse(rawDraft) as PaymentDraft;
      setSelectedSplitIds(Array.isArray(draft.selectedSplitIds) ? draft.selectedSplitIds : []);
      setAmount(typeof draft.amount === "string" ? draft.amount : "");
      setNotes(typeof draft.notes === "string" ? draft.notes : "");
      setAmountTouched(Boolean(draft.amountTouched));
      setReceiptMetadata(
        draft.receiptMetadata &&
          typeof draft.receiptMetadata.name === "string" &&
          typeof draft.receiptMetadata.size === "number" &&
          typeof draft.receiptMetadata.type === "string"
          ? draft.receiptMetadata
          : null
      );
    } catch {
      sessionStorage.removeItem(PAYMENT_DRAFT_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    const draftToPersist: PaymentDraft = {
      selectedSplitIds,
      amount,
      notes,
      amountTouched,
      receiptMetadata,
    };
    sessionStorage.setItem(PAYMENT_DRAFT_STORAGE_KEY, JSON.stringify(draftToPersist));
  }, [selectedSplitIds, amount, notes, amountTouched, receiptMetadata]);

  useEffect(() => {
    if (!pendingSplits?.length || selectedSplitIds.length === 0) return;
    const validSplitIds = new Set(pendingSplits.map((split) => split.id));
    const filteredSelected = selectedSplitIds.filter((id) => validSplitIds.has(id));
    if (filteredSelected.length !== selectedSplitIds.length) {
      setSelectedSplitIds(filteredSelected);
    }
  }, [pendingSplits, selectedSplitIds]);

  useEffect(() => {
    if (!pendingSplits) return;
    const total = pendingSplits
      .filter((s) => selectedSplitIds.includes(s.id))
      .reduce((sum, s) => sum + Number(s.amount), 0);
    
    if (selectedSplitIds.length > 0 && !amountTouched) {
      setAmount(total.toFixed(2));
    } else if (selectedSplitIds.length === 0) {
      setAmount("");
      setAmountTouched(false);
    }
  }, [selectedSplitIds, pendingSplits, amountTouched]);

  const toggleSplitSelection = (id: string) => {
    setSelectedSplitIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const trackUploadMetric = async (
    action: "payment_upload_attempt" | "payment_upload_success" | "payment_upload_failed",
    details?: Record<string, unknown>
  ) => {
    if (!membership?.group_id || !user?.id) return;
    try {
      await supabase.rpc("create_audit_log", {
        _group_id: membership.group_id,
        _user_id: user.id,
        _action: action,
        _entity_type: "payment_upload",
        _entity_id: null,
        _details: {
          platform: platformLabel,
          native_runtime: isNativeRuntime,
          ...details,
        },
      } as any);
    } catch { /* ignore */ }
  };

  const handleSubmitPayment = async () => {
    if (selectedSplitIds.length === 0 || !amount || parseFloat(amount) <= 0) {
      toast({ title: "Erro", description: "Selecione pelo menos uma despesa.", variant: "destructive" });
      return;
    }
    if (!receiptFile) {
      toast({ title: "Erro", description: "Anexe o comprovante de pagamento.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      await trackUploadMetric("payment_upload_attempt", {
        selected_split_count: selectedSplitIds.length,
        has_receipt: !!receiptFile,
      });

      const paidAmount = Number(amount);
      const selectedSplits = (pendingSplits ?? []).filter((s) => selectedSplitIds.includes(s.id));
      const selectedTotal = selectedSplits.reduce((sum, s) => sum + Number(s.amount), 0);

      if (paidAmount < selectedTotal) {
        toast({
          title: "Valor insuficiente",
          description: `O valor informado deve cobrir o total selecionado (R$ ${selectedTotal.toFixed(2)}).`,
          variant: "destructive",
        });
        return;
      }

      const ext = receiptFile.name.split(".").pop();
      const path = `${user!.id}/${Date.now()}.${ext}`;
      await supabase.storage.from("receipts").upload(path, receiptFile);
      const { data: urlData } = supabase.storage.from("receipts").getPublicUrl(path);

      const compKey = getCompetenceKeyFromDate(new Date(), closingDay);
      const [y, m] = compKey.split("-").map(Number);

      const paymentsToInsert = selectedSplits.map((split) => ({
        group_id: membership!.group_id,
        expense_split_id: split.id,
        paid_by: user!.id,
        competence_key: compKey,
        competence_year: y,
        competence_month: m,
        amount: Number(split.amount),
        receipt_url: urlData.publicUrl,
        notes: notes.trim() || (selectedSplitIds.length > 1 ? "Pagamento em lote" : null),
      }));

      const creditAmount = paidAmount - selectedTotal;
      if (creditAmount > 0) {
        paymentsToInsert.push({
          group_id: membership!.group_id,
          expense_split_id: null,
          paid_by: user!.id,
          competence_key: compKey,
          competence_year: y,
          competence_month: m,
          amount: Number(creditAmount.toFixed(2)),
          receipt_url: urlData.publicUrl,
          notes: notes.trim() || "Crédito por pagamento acima do total devido",
        });
      }

      const { error } = await (supabase.from("payments") as any).insert(paymentsToInsert);
      if (error) throw error;

      toast({ title: "Pagamento enviado!" });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["my-pending-splits"] });
      await trackUploadMetric("payment_upload_success", {
        selected_split_count: selectedSplitIds.length,
        credit_amount: Number(creditAmount.toFixed(2)),
      });
      
      setOpen(false);
      clearPaymentDraft();
    } catch (err: any) {
      await trackUploadMetric("payment_upload_failed", {
        stage: "submit",
        error: err?.message ?? "unknown_error",
      });
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleConfirm = async (paymentId: string, status: "confirmed" | "rejected") => {
    try {
      const { error } = await supabase.rpc("confirm_payment", {
        _payment_id: paymentId,
        _status: status,
      });
      if (error) throw error;
      toast({ title: status === "confirmed" ? "Pagamento confirmado" : "Pagamento recusado" });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
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
        onCompactChange={setHeroCompact}
        title="Pagamentos"
        subtitle="Histórico de pagamentos."
        tone="primary"
        icon={<CreditCard className="h-4 w-4" />}
        actions={
          <div className="flex w-full flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            <div className="flex h-10 w-full items-center justify-between rounded-lg border bg-card p-1 shadow-sm sm:w-auto">
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={prevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex-1 px-2 text-center text-sm font-medium capitalize truncate sm:min-w-[140px]">
                {format(currentDate, "MMMM yyyy", { locale: ptBR })}
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={nextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {!isAdmin && (pendingSplits?.length ?? 0) > 0 && (
              <Dialog
                open={open}
                onOpenChange={(nextOpen) => {
                  setOpen(nextOpen);
                  if (!nextOpen) {
                    setComboboxOpen(false);
                  }
                }}
              >
                <DialogTrigger asChild>
                  <Button className="h-10 w-full gap-2 sm:w-auto"><Plus className="h-4 w-4" /> Enviar Pagamento</Button>
                </DialogTrigger>
                <DialogContent className="max-w-md p-0 gap-0 flex flex-col overflow-hidden max-h-[85vh]">
                  <DialogHeader className="px-6 pt-6 pb-4 shrink-0 border-b bg-background">
                    <DialogTitle className="font-serif">Enviar Comprovante</DialogTitle>
                  </DialogHeader>
                  <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                    <div className="space-y-2">
                      <Label>Despesas ({selectedSplitIds.length})</Label>
                      <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" role="combobox" aria-expanded={comboboxOpen} className="w-full justify-between font-normal">
                            {selectedSplitIds.length > 0 ? `${selectedSplitIds.length} item(ns) selecionado(s)` : "Selecione as despesas..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[350px] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Buscar despesa..." />
                            <CommandList className="max-h-[30vh] overflow-y-auto">
                              <CommandEmpty>Nenhuma despesa pendente.</CommandEmpty>
                              <CommandGroup>
                                {pendingSplits?.map((split: any) => (
                                  <CommandItem key={split.id} value={split.id + split.expenses?.title} onSelect={() => toggleSplitSelection(split.id)} className="cursor-pointer">
                                    <div className={cn("mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary", selectedSplitIds.includes(split.id) ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible")}>
                                      <Check className={cn("h-4 w-4")} />
                                    </div>
                                    <div className="flex flex-1 justify-between items-center gap-2 overflow-hidden">
                                      <span className="truncate">{split.expenses?.title}</span>
                                      <span className="text-muted-foreground whitespace-nowrap">R$ {Number(split.amount).toFixed(2)}</span>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <Label>Valor Total (R$)</Label>
                      <Input
                        type="number"
                        value={amount}
                        onChange={(e) => {
                          setAmountTouched(true);
                          setAmount(e.target.value);
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Comprovante *</Label>
                      <Input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0] ?? null;
                          setReceiptFile(file);
                          setReceiptMetadata(
                            file
                              ? {
                                  name: file.name,
                                  size: file.size,
                                  type: file.type,
                                }
                              : null
                          );
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Observações (opcional)</Label>
                      <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex: Pix enviado às 14h" />
                    </div>
                  </div>
                  <div className="px-6 pb-6 pt-4 shrink-0 border-t bg-background flex gap-2">
                    <Button variant="ghost" onClick={() => { clearPaymentDraft(); setOpen(false); }} className="w-full">Cancelar</Button>
                    <Button onClick={handleSubmitPayment} disabled={saving} className="w-full">
                      {saving ? <CustomLoader className="h-4 w-4 mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                      Enviar Pagamento
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        }
      />

      <div className="text-sm text-muted-foreground">
        Exibindo competência: <strong>{format(cycleStart, "dd/MM")}</strong> até <strong>{format(subDays(cycleEnd, 1), "dd/MM")}</strong>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-l-4 border-l-warning bg-card shadow-sm flex flex-col">
          <CardContent className="p-0 flex-1 flex flex-col">
            <div className="p-4 border-b bg-muted/20">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-warning"></div>
                Pendentes
                <Badge variant="secondary" className="ml-auto">
                  {payments?.filter((p) => p.status === "pending").length || 0}
                </Badge>
              </h3>
            </div>
            <div className="p-4 space-y-3 flex-1 overflow-auto">
              {payments?.filter((p) => p.status === "pending").length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-sm">Nenhum pagamento pendente.</div>
              ) : (
                payments?.filter((p) => p.status === "pending").map((p: any) => (
                  <PaymentItem key={p.id} payment={p} isAdmin={isAdmin} onConfirm={handleConfirm} onManage={openManage} />
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-success bg-card shadow-sm flex flex-col">
          <CardContent className="p-0 flex-1 flex flex-col">
            <div className="p-4 border-b bg-muted/20">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-success"></div>
                Histórico
                <Badge variant="secondary" className="ml-auto">
                  {payments?.filter((p) => p.status !== "pending").length || 0}
                </Badge>
              </h3>
            </div>
            <div className="p-4 space-y-3 flex-1 overflow-auto">
              {payments?.filter((p) => p.status !== "pending").length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-sm">Nenhum pagamento no histórico.</div>
              ) : (
                payments?.filter((p) => p.status !== "pending").map((p: any) => (
                  <PaymentItem key={p.id} payment={p} isAdmin={isAdmin} onConfirm={handleConfirm} onManage={openManage} />
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!editingPayment} onOpenChange={(open) => !open && setEditingPayment(null)}>
        <DialogContent className="max-w-md p-0 gap-0 flex flex-col overflow-hidden max-h-[85vh]">
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0 border-b bg-background">
            <DialogTitle>Gerenciar Pagamento</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor (R$)</Label>
                <Input type="number" min="0.01" step="0.01" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Competência</Label>
                <Input type="month" value={editCompetence} onChange={(e) => setEditCompetence(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="confirmed">Confirmado</SelectItem>
                  <SelectItem value="rejected">Recusado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Input value={editNotes} onChange={(e) => setEditNotes(e.target.value)} />
            </div>
          </div>
          <div className="px-6 pb-6 pt-4 shrink-0 border-t bg-background flex justify-between items-center">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir pagamento?</AlertDialogTitle>
                  <AlertDialogDescription>Essa ação não pode ser desfeita.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => editingPayment && deletePayment.mutate(editingPayment.id)} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditingPayment(null)}>Cancelar</Button>
              <Button onClick={() => updatePayment.mutate({ amount: editAmount, notes: editNotes, status: editStatus, competence: editCompetence })} disabled={updatePayment.isPending}>
                {updatePayment.isPending && <CustomLoader className="h-4 w-4 mr-2" />} Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PaymentItem({ payment, isAdmin, onConfirm, onManage }: any) {
  const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
    pending: { label: "Pendente", variant: "secondary" },
    confirmed: { label: "Confirmado", variant: "default" },
    rejected: { label: "Recusado", variant: "destructive" },
  };
  const s = statusMap[payment.status] ?? statusMap.pending;

  return (
    <div className="p-3 bg-background border rounded-lg shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm">{payment.payer_name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {format(new Date(payment.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </p>
          {payment.notes && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{payment.notes}</p>}
          {payment.receipt_url && (
            <Button variant="outline" size="sm" className="h-7 text-xs mt-2 w-fit gap-1.5" asChild>
              <a href={payment.receipt_url} target="_blank" rel="noopener noreferrer">
                <ImageIcon className="h-3 w-3" /> Ver comprovante
              </a>
            </Button>
          )}
        </div>
        <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-1">
            <p className="text-sm font-bold">R$ {Number(payment.amount).toFixed(2)}</p>
            {isAdmin && onManage && (
              <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={() => onManage(payment)}><Settings className="h-3 w-3" /></Button>
            )}
          </div>
          <Badge variant={s.variant} className="text-[10px] px-1.5 py-0 h-4">{s.label}</Badge>
          {isAdmin && payment.status === "pending" && (
            <div className="flex gap-1 mt-1">
              <Button size="icon" variant="default" className="h-6 w-6" onClick={() => onConfirm(payment.id, "confirmed")}><Check className="h-3 w-3" /></Button>
              <Button size="icon" variant="destructive" className="h-6 w-6" onClick={() => onConfirm(payment.id, "rejected")}><X className="h-3 w-3" /></Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}