'''import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { parseLocalDate, cn } from "@/lib/utils";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
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
import { CustomLoader } from "@/components/ui/custom-loader";
import {
  Plus,
  Calendar,
  Users,
  User,
  Save,
  Edit,
  CreditCard,
  Trash2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Receipt,
  Settings,
  Search,
  X,
} from "lucide-react";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useCycleDates } from "@/hooks/useCycleDates";
import { getCompetenceKeyFromDate, formatCompetenceKey } from "@/lib/cycleDates";
import { PageHero } from "@/components/layout/PageHero";

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

type ExpenseRow = {
  id: string;
  group_id: string;
  created_by: string;
  title: string;
  description: string | null;
  amount: number;
  category: string;
  expense_type: string;
  due_date: string | null;
  paid_to_provider: boolean;
  receipt_url: string | null;
  recurring_expense_id: string | null;
  created_at: string;
  updated_at: string;
  payment_method: string;
  credit_card_id: string | null;
  installments: number;
  purchase_date: string;
  competence_key: string | null;
  expense_splits?: Array<{
    id: string;
    user_id: string;
    amount: number;
    status: string;
    paid_at: string | null;
  }>;
};

type InstallmentRow = {
  id: string;
  expense_id: string;
  installment_number: number;
  amount: number;
  bill_month: number;
  bill_year: number;
};

export default function Expenses() {
  const { membership, isAdmin, user } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("all");
  const [heroCompact, setHeroCompact] = useState(false);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingType, setEditingType] = useState<"expense" | "recurring">("expense");

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("other");
  const [customCategory, setCustomCategory] = useState("");
  const [expenseType, setExpenseType] = useState<"collective" | "individual">(isAdmin ? "collective" : "individual");
  const [dateValue, setDateValue] = useState(format(new Date(), "yyyy-MM-dd"));
  const [editCompetence, setEditCompetence] = useState(format(new Date(), "yyyy-MM"));
  const [description, setDescription] = useState("");
  const [splitBetweenAll, setSplitBetweenAll] = useState(true);

  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [creditCardId, setCreditCardId] = useState<string>("none");
  const [installments, setInstallments] = useState("1");

  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceDay, setRecurrenceDay] = useState("5");

  const [deleteConfirmExpense, setDeleteConfirmExpense] = useState<any>(null);
  const [editConfirmExpense, setEditConfirmExpense] = useState<any>(null);

  const [isPaid, setIsPaid] = useState(false);
  const [statusWithProvider, setStatusWithProvider] = useState<"pending" | "paid">("pending");
  const [splitMode, setSplitMode] = useState<"all" | "manual" | "exact">("all");
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([]);
  const [exactSplitAmounts, setExactSplitAmounts] = useState<Record<string, string>>({});
  const [payerUserId, setPayerUserId] = useState<string>("me");
  const [paymentDate, setPaymentDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);

  const [quickPayExpense, setQuickPayExpense] = useState<ExpenseRow | null>(null);
  const [quickPayerUserId, setQuickPayerUserId] = useState<string>("me");
  const [quickPaymentDate, setQuickPaymentDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [quickReceiptFile, setQuickReceiptFile] = useState<File | null>(null);

  const [editingOriginalAmount, setEditingOriginalAmount] = useState<number | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { currentDate, setCurrentDate, cycleStart, cycleEnd, nextMonth, prevMonth, loading, closingDay } = useCycleDates(membership?.group_id);

  useEffect(() => {
    if (!editingId && activeTab !== "recurring") {
      setExpenseType(isAdmin ? "collective" : "individual");
    }
  }, [isAdmin, editingId, activeTab]);

  useEffect(() => {
    if (category !== "other") {
      setCustomCategory("");
    }
  }, [category]);

  const currentCompetenceKey = formatCompetenceKey(currentDate);

  const { data: globalSearchResults = [] } = useQuery({
    queryKey: ["global-expenses-search", membership?.group_id, debouncedSearch, currentCompetenceKey],
    queryFn: async () => {
      if (!debouncedSearch.trim() || !membership?.group_id) return [];
      
      const { data, error } = await supabase
        .from("expenses")
        .select("id, title, purchase_date, competence_key, amount, category, expense_type")
        .eq("group_id", membership.group_id)
        .ilike("title", `%${debouncedSearch}%`)
        .neq("competence_key", currentCompetenceKey)
        .order("purchase_date", { ascending: false })
        .limit(10);
        
      if (error) throw error;
      return data;
    },
    enabled: !!debouncedSearch.trim() && !!membership?.group_id,
  });

  const { data: cycleExpenses = [], isLoading: loadingExpenses } = useQuery({
    queryKey: ["expenses", membership?.group_id, currentCompetenceKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("*, expense_splits(id, user_id, amount, status, paid_at)")
        .eq("group_id", membership!.group_id)
        .eq("competence_key", currentCompetenceKey)
        .order("purchase_date", { ascending: false });

      if (error) throw error;
      return (data ?? []) as ExpenseRow[];
    },
    enabled: !!membership?.group_id,
    staleTime: 60_000,
  });

  const { data: monthInstallments = [] } = useQuery({
    queryKey: ["expense-installments-by-month", membership?.group_id, currentDate.getMonth(), currentDate.getFullYear()],
    queryFn: async () => {
      const targetMonth = currentDate.getMonth() + 1;
      const targetYear = currentDate.getFullYear();

      const { data, error } = await supabase
        .from("expense_installments" as any)
        .select("id, expense_id, installment_number, amount, bill_month, bill_year, expenses!inner(group_id)")
        .eq("expenses.group_id", membership!.group_id)
        .eq("bill_month", targetMonth)
        .eq("bill_year", targetYear);

      if (error) {
        return [] as InstallmentRow[];
      }
      return (data ?? []) as unknown as InstallmentRow[];

    },
    enabled: !!membership?.group_id,
    staleTime: 60_000,
  });

  const missingExpenseIds = useMemo(() => {
    const cycleIds = new Set(cycleExpenses.map((e) => e.id));
    return [...new Set(monthInstallments.map((i) => i.expense_id).filter((id) => !cycleIds.has(id)))];
  }, [cycleExpenses, monthInstallments]);

  const { data: installmentParentExpenses = [] } = useQuery({
    queryKey: ["installment-parent-expenses", missingExpenseIds],
    queryFn: async () => {
      if (missingExpenseIds.length === 0) return [];
      const { data, error } = await supabase
        .from("expenses")
        .select("*, expense_splits(id, user_id, amount, status, paid_at)")
        .in("id", missingExpenseIds);
      if (error) throw error;
      return (data ?? []) as ExpenseRow[];
    },
    enabled: missingExpenseIds.length > 0,
  });

  const allExpenses = useMemo(() => {
    const map = new Map<string, ExpenseRow>();
    cycleExpenses.forEach((e) => map.set(e.id, e));
    installmentParentExpenses.forEach((e) => map.set(e.id, e));
    return Array.from(map.values());
  }, [cycleExpenses, installmentParentExpenses]);

  const installmentByExpenseId = useMemo(() => {
    const map = new Map<string, InstallmentRow>();
    monthInstallments.forEach((i) => map.set(i.expense_id, i));
    return map;
  }, [monthInstallments]);

  const { data: recurringExpenses, isLoading: loadingRecurring } = useQuery({
    queryKey: ["recurring-expenses", membership?.group_id],
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
    staleTime: 60_000,
  });

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
      const [{ data: members, error: membersError }, { data: profiles, error: profilesError }] = await Promise.all([
        supabase
          .from("group_members")
          .select("user_id")
          .eq("group_id", membership!.group_id)
          .eq("active", true),
        supabase.rpc("get_group_member_public_profiles", {
          _group_id: membership!.group_id,
        }),
      ]);

      if (membersError) throw membersError;
      if (profilesError) throw profilesError;

      const profileMap = new Map((profiles ?? []).map((profile: any) => [profile.id, profile]));
      return (members ?? []).map((member) => {
        const profile = profileMap.get(member.user_id);
        const label = profile?.full_name || profile?.email?.split("@")[0] || "Morador";
        return {
          user_id: member.user_id,
          label,
        };
      });
    },
    enabled: !!membership?.group_id,
  });

  const activeMemberIds = useMemo(() => activeMembers.map((member) => member.user_id), [activeMembers]);

  useEffect(() => {
    setSelectedParticipantIds(activeMemberIds);
  }, [activeMemberIds]);

  const deleteExpenseMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("expense_installments").delete().eq("expense_id", id);
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["expense-installments-by-month"] });
      queryClient.invalidateQueries({ queryKey: ["installment-parent-expenses"] });
      toast({ title: "Despesa excluída." });
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const deleteRecurring = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("recurring_expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-expenses"] });
      toast({ title: "Recorrência excluída." });
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const participantOptions = useMemo(() => {
    return activeMembers.map((member) => ({
      id: member.user_id,
      name: member.label || "Morador",
    }));
  }, [activeMembers]);

  const effectiveParticipantIds = useMemo(() => {
    if (editingType !== "expense") return [];
    if (expenseType === "individual") return user?.id ? [user.id] : [];
    if (splitMode === "all") return participantOptions.map((p) => p.id);
    if (splitMode === "manual") return selectedParticipantIds;
    if (splitMode === "exact") return Object.keys(exactSplitAmounts).filter(id => Number(exactSplitAmounts[id]) > 0);
    return [];
  }, [editingType, expenseType, user?.id, splitMode, participantOptions, selectedParticipantIds, exactSplitAmounts]);

  const perPersonQuota = useMemo(() => {
    const total = Number(amount) || 0;
    const count = effectiveParticipantIds.length;
    if (!count || total <= 0 || splitMode === 'exact') return 0;
    return total / count;
  }, [amount, effectiveParticipantIds.length, splitMode]);

  const exactSplitSum = useMemo(() => {
    return Object.values(exactSplitAmounts).reduce((sum, current) => sum + (Number(current) || 0), 0);
  }, [exactSplitAmounts]);

  const exactSplitRemaining = useMemo(() => {
    const total = Number(amount) || 0;
    return total - exactSplitSum;
  }, [amount, exactSplitSum]);

  const payerLabel = useMemo(() => {
    if (payerUserId === "me") return "Você";
    return participantOptions.find((p) => p.id === payerUserId)?.name || "Não definido";
  }, [payerUserId, participantOptions]);

  const instantSummary = useMemo(() => {
    if (expenseType !== "collective" || perPersonQuota <= 0) {
      return null;
    }

    const payerName = participantOptions.find((p) => p.id === payerUserId)?.name || "um participante";
    const actualPayerId = payerUserId === "me" ? user?.id : payerUserId;

    // Scenario 1: Current user is the payer
    if (actualPayerId === user?.id) {
      if (!editingId) {
        // New expense
        const otherParticipantsCount = effectiveParticipantIds.length - 1;
        if (otherParticipantsCount <= 0) {
          return <p>Você está pagando a despesa inteira.</p>;
        }
        if (isPaid) {
          return <p>Você marcou que já recebeu o reembolso de todos os participantes.</p>;
        }
        return (
          <p>
            Você receberá{" "}
            <strong className="text-primary">R$ {perPersonQuota.toFixed(2)}</strong> de cada um dos{" "}
            {otherParticipantsCount} outros participantes.
          </p>
        );
      } else {
        // Editing an existing expense
        const expense = allExpenses.find((e) => e.id === editingId);
        if (!expense || !expense.expense_splits) return null;

        const otherSplits = expense.expense_splits.filter((s) => s.user_id !== user?.id);
        if (otherSplits.length === 0) {
          return <p>Você está pagando a despesa inteira.</p>;
        }

        const paid = otherSplits.filter((s) => s.status === "paid");
        const pending = otherSplits.filter((s) => s.status === "pending");

        if (pending.length === 0) {
          return <p>Todos os participantes já te reembolsaram.</p>;
        }

        const summaryElements = [];
        if (paid.length > 0) {
          const names = paid
            .map((s) => participantOptions.find((p) => p.id === s.user_id)?.name)
            .filter(Boolean);
          summaryElements.push(<p key="paid">{names.join(", ")} te pagou.</p>);
        }
        if (pending.length > 0) {
          const names = pending
            .map((s) => participantOptions.find((p) => p.id === s.user_id)?.name)
            .filter(Boolean);
          summaryElements.push(
            <p key="pending">
              {names.join(", ")} te deve{" "}
              <strong className="text-primary">R$ {perPersonQuota.toFixed(2)}</strong> cada.
            </p>
          );
        }
        return <div className="space-y-1">{summaryElements}</div>;
      }
    } else {
      // Scenario 2: Another member is the payer
      if (!editingId) {
        // New expense
        if (!effectiveParticipantIds.includes(user?.id ?? '')) {
          return <p>Você não participa do rateio desta despesa.</p>;
        }
        if (isPaid) {
          return (
            <p>
              Você será marcado como tendo pago{" "}
              <strong className="text-primary">R$ {perPersonQuota.toFixed(2)}</strong> para {payerName}.
            </p>
          );
        }
        return (
          <p>
            Você deve <strong className="text-primary">R$ {perPersonQuota.toFixed(2)}</strong> para {payerName}.
          </p>
        );
      } else {
        // Editing an existing expense
        const expense = allExpenses.find((e) => e.id === editingId);
        if (!expense || !expense.expense_splits) return null;

        const mySplit = expense.expense_splits.find((s) => s.user_id === user?.id);
        if (!mySplit) {
          return <p>Você não participa desta despesa.</p>;
        }

        if (mySplit.status === "paid") {
          return (
            <p>
              Você pagou <strong className="text-primary">R$ {Number(mySplit.amount).toFixed(2)}</strong> para{" "}
              {payerName}.
            </p>
          );
        } else {
          return (
            <p>
              Você deve <strong className="text-primary">R$ {Number(mySplit.amount).toFixed(2)}</strong> para{" "}
              {payerName}.
            </p>
          );
        }
      }
    }
  }, [
    expenseType,
    perPersonQuota,
    payerUserId,
    user?.id,
    editingId,
    isPaid,
    effectiveParticipantIds,
    allExpenses,
    participantOptions,
  ]);

  const applyManualSplitSelection = async (expenseId: string, totalAmount: number, participantIds: string[]) => {
    const uniqueParticipantIds = Array.from(new Set(participantIds));
    if (uniqueParticipantIds.length === 0) {
      throw new Error("Selecione pelo menos 1 participante para o rateio manual.");
    }

    const { data: existingSplits, error: splitErr } = await supabase
      .from("expense_splits")
      .select("id, user_id")
      .eq("expense_id", expenseId);
    if (splitErr) throw splitErr;

    const selectedSet = new Set(uniqueParticipantIds);
    const existing = existingSplits ?? [];
    const toDelete = existing.filter((split) => !selectedSet.has(split.user_id)).map((split) => split.id);

    if (toDelete.length > 0) {
      const { error: deleteErr } = await supabase.from("expense_splits").delete().in("id", toDelete);
      if (deleteErr) throw deleteErr;
    }

    const cents = Math.round(totalAmount * 100);
    const baseCents = Math.floor(cents / uniqueParticipantIds.length);
    const remainder = cents - baseCents * uniqueParticipantIds.length;

    for (const [index, userId] of uniqueParticipantIds.entries()) {
      const splitAmount = (baseCents + (index < remainder ? 1 : 0)) / 100;
      const existingSplit = existing.find((split) => split.user_id === userId);
      if (existingSplit) {
        const { error: updateErr } = await supabase
          .from("expense_splits")
          .update({ amount: splitAmount })
          .eq("id", existingSplit.id);
        if (updateErr) throw updateErr;
      } else {
        const { error: insertErr } = await supabase.from("expense_splits").insert({
          expense_id: expenseId,
          user_id: userId,
          amount: splitAmount,
          status: "pending",
        });
        if (insertErr) throw insertErr;
      }
    }
  };

  const fetchSavedExpense = async (expenseId: string) => {
    const { data, error } = await supabase
      .from("expenses")
      .select("id, purchase_date")
      .eq("id", expenseId)
      .single();

    if (error) throw error;
    return data as Pick<ExpenseRow, "id" | "purchase_date">;
  };

  const handleSave = async () => {
    const collectiveParticipantIds = splitBetweenAll ? activeMemberIds : selectedParticipantIds;
    const individualParticipantIds = user?.id ? [user.id] : [];

    if (!title.trim() || !amount || parseFloat(amount) <= 0) {
      toast({ title: "Erro", description: "Preencha título e valor.", variant: "destructive" });
      return;
    }

    if (paymentMethod === "credit_card" && (creditCardId === "none" || !creditCardId) && editingType === "expense") {
      toast({ title: "Erro", description: "Selecione um cartão de crédito.", variant: "destructive" });
      return;
    }

    if (expenseType === "collective" && splitMode === "manual" && selectedParticipantIds.length === 0) {
      toast({ title: "Erro", description: "Selecione pelo menos um participante.", variant: "destructive" });
      return;
    }

    if (expenseType === "collective" && splitMode === "exact" && Math.abs(exactSplitRemaining) > 0.001) {
      toast({ title: "Erro na divisão", description: `A soma dos valores (R$ ${exactSplitSum.toFixed(2)}) não bate com o total da despesa (R$ ${Number(amount).toFixed(2)}).`, variant: "destructive" });
      return;
    }

    const categoryToSend = category === "other" ? customCategory.trim() : category;
    const finalCreditCardId = creditCardId === "none" ? null : creditCardId;
    const providerPaid = paymentMethod === "credit_card" || statusWithProvider === "paid" || isPaid;

    let uploadedReceiptUrl = receiptUrl;

    setSaving(true);
    try {
      if (receiptFile) {
        const ext = receiptFile.name.split(".").pop() ?? "jpg";
        const path = `${user!.id}/${Date.now()}_expense.${ext}`;
        const { error: uploadError } = await supabase.storage.from("receipts").upload(path, receiptFile);
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage.from("receipts").getPublicUrl(path);
        uploadedReceiptUrl = publicUrlData.publicUrl;
      }

      if (editingType === "recurring" && editingId) {
        const { error } = await supabase
          .from("recurring_expenses")
          .update({
            title: title.trim(),
            amount: parseFloat(amount),
            category: categoryToSend,
            description: description.trim() || null,
            next_due_date: dateValue,
            day_of_month: parseInt(dateValue.split("-")[2]),
          })
          .eq("id", editingId);
        if (error) throw error;
        toast({ title: "Recorrência atualizada!" });
        queryClient.invalidateQueries({ queryKey: ["recurring-expenses"] });
      } else if (editingType === "expense" && editingId) {
        const parsedAmount = parseFloat(amount);
        const parsedInstallments = parseInt(installments) || 1;

        const compKey = editCompetence?.trim()
          ? editCompetence
          : getCompetenceKeyFromDate(
              new Date(`${dateValue}T12:00:00`),
              finalCreditCardId && finalCreditCardId !== "none"
                ? cards.find((c) => c.id === finalCreditCardId)?.closing_day || 1
                : closingDay,
            );

        const { error } = await supabase
          .from("expenses")
          .update({
            title: title.trim(),
            description: description.trim() || null,
            amount: parsedAmount,
            category: categoryToSend,
            payment_method: paymentMethod,
            credit_card_id: finalCreditCardId,
            installments: parsedInstallments,
            purchase_date: dateValue,
            paid_to_provider: providerPaid,
            due_date: paymentDate || null,
            receipt_url: uploadedReceiptUrl,
            competence_key: compKey,
          })
          .eq("id", editingId);
        if (error) throw error;
        const savedExpense = await fetchSavedExpense(editingId);
        setDateValue(savedExpense.purchase_date);

        if (editingOriginalAmount && parsedAmount !== editingOriginalAmount) {
          const ratio = parsedAmount / editingOriginalAmount;
          const { data: splits } = await supabase
            .from("expense_splits")
            .select("id, amount")
            .eq("expense_id", editingId);
          if (splits && splits.length > 0) {
            for (const split of splits) {
              await supabase
                .from("expense_splits")
                .update({ amount: Math.round(Number(split.amount) * ratio * 100) / 100 })
                .eq("id", split.id);
            }
          }
        }

        await supabase.from("expense_installments").delete().eq("expense_id", editingId);

        if (paymentMethod === "credit_card" && finalCreditCardId && parsedInstallments > 0) {
          const card = cards.find((c) => c.id === finalCreditCardId);
          if (card) {
            const closingDay = card.closing_day;
            const purchaseDate = new Date(`${dateValue}T12:00:00`);
            const billBase = new Date(purchaseDate);
            if (purchaseDate.getDate() >= closingDay) {
              billBase.setMonth(billBase.getMonth() + 1);
            }

            const perInstallment = Math.round((parsedAmount / parsedInstallments) * 100) / 100;
            const installmentRows = [];
            for (let i = 1; i <= parsedInstallments; i++) {
              const installDate = new Date(billBase);
              installDate.setMonth(installDate.getMonth() + (i - 1));
              installmentRows.push({
                user_id: user!.id,
                expense_id: editingId,
                installment_number: i,
                amount: perInstallment,
                bill_month: installDate.getMonth() + 1,
                bill_year: installDate.getFullYear(),
              });
            }
            await supabase.from("expense_installments").insert(installmentRows);
          }
        }

        if (expenseType === "collective" && splitMode === "manual") {
          await applyManualSplitSelection(editingId, parsedAmount, effectiveParticipantIds);
        }

        toast({ title: "Despesa atualizada!" });
        queryClient.invalidateQueries({ queryKey: ["expenses"] });
        queryClient.invalidateQueries({ queryKey: ["expense-installments-by-month"] });
      } else {
        const compKey = getCompetenceKeyFromDate(
          new Date(`${dateValue}T12:00:00`), 
          finalCreditCardId && finalCreditCardId !== 'none' ? (cards.find(c => c.id === finalCreditCardId)?.closing_day || 1) : closingDay
        );

        const baseCreateExpenseArgs = {
          _group_id: membership!.group_id,
          _title: title.trim(),
          _description: description.trim() || null,
          _amount: parseFloat(amount),
          _category: categoryToSend,
          _expense_type: expenseType,
          _due_date: null,
          _receipt_url: null,
          _recurring_expense_id: null,
          _target_user_id: expenseType === "individual" ? user?.id : null,
          _payment_method: paymentMethod,
          _credit_card_id: finalCreditCardId,
          _installments: parseInt(installments) || 1,
          _purchase_date: dateValue,
        };

        const { data: newExpenseId, error: createError } = await supabase.rpc(
          "create_expense_with_splits",
          {
            ...baseCreateExpenseArgs,
            _participant_user_ids: expenseType === "collective" ? collectiveParticipantIds : individualParticipantIds,
          },
        );

        if (createError) throw createError;

        if (newExpenseId) {
          await supabase
            .from("expenses")
            .update({
              paid_to_provider: providerPaid,
              due_date: paymentDate || null,
              receipt_url: uploadedReceiptUrl,
            })
            .eq("id", newExpenseId);
        }

        if (newExpenseId && expenseType === "collective" && splitMode === "manual") {
          await applyManualSplitSelection(newExpenseId as string, parseFloat(amount), effectiveParticipantIds);
        }

        if (isPaid && paymentMethod !== "credit_card" && newExpenseId) {
          await supabase
            .from("expense_splits")
            .update({ status: "paid", paid_at: new Date().toISOString() })
            .eq("expense_id", newExpenseId);
        }

        if (isRecurring) {
          const day = parseInt(recurrenceDay);
          const nextMonthDate = new Date();
          nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
          nextMonthDate.setDate(day);

          await supabase.from("recurring_expenses").insert({
            group_id: membership!.group_id,
            created_by: user!.id,
            title: title.trim(),
            description: description.trim() || null,
            amount: parseFloat(amount),
            category: categoryToSend,
            frequency: "monthly",
            day_of_month: day,
            next_due_date: nextMonthDate.toISOString().split("T")[0],
            active: true,
            expense_type: expenseType,
          } as any);
          queryClient.invalidateQueries({ queryKey: ["recurring-expenses"] });
        }

        toast({ title: "Despesa criada!" });
        queryClient.invalidateQueries({ queryKey: ["expenses"] });
        queryClient.invalidateQueries({ queryKey: ["expense-installments-by-month"] });
      }

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
    setEditingType("expense");
    setTitle("");
    setAmount("");
    setCategory("other");
    setCustomCategory("");
    setExpenseType(isAdmin ? "collective" : "individual");
    setDateValue(format(new Date(), "yyyy-MM-dd"));
    setEditCompetence(format(new Date(), "yyyy-MM"));
    setDescription("");
    setSplitBetweenAll(true);
    setSelectedParticipantIds(activeMemberIds);
    setExactSplitAmounts({});
    setPaymentMethod("cash");
    setCreditCardId("none");
    setInstallments("1");
    setIsRecurring(false);
    setRecurrenceDay("5");
    setIsPaid(false);
    setStatusWithProvider("pending");
    setSplitMode("all");
    setPayerUserId("me");
    setPaymentDate(format(new Date(), "yyyy-MM-dd"));
    setReceiptFile(null);
    setReceiptUrl(null);
    setEditingOriginalAmount(null);
  };

  const openEditExpense = (expense: any) => {
    resetForm();
    setEditingType("expense");
    setEditingId(expense.id);
    setTitle(expense.title);
    setAmount(String(expense.amount));
    setEditingOriginalAmount(Number(expense.amount));
    setDescription(expense.description || "");
    setDateValue(expense.purchase_date || format(new Date(), "yyyy-MM-dd"));
    setEditCompetence(expense.competence_key || (expense.purchase_date ? expense.purchase_date.slice(0, 7) : format(new Date(), "yyyy-MM")));
    setExpenseType(expense.expense_type);
    setPaymentMethod(expense.payment_method || "cash");
    setCreditCardId(expense.credit_card_id || "none");
    setInstallments(String(expense.installments || 1));
    setStatusWithProvider(expense.paid_to_provider ? "paid" : "pending");
    setPaymentDate(expense.due_date || expense.purchase_date || format(new Date(), "yyyy-MM-dd"));
    setReceiptUrl(expense.receipt_url || null);
    setPayerUserId(expense.created_by || "me");

    const currentSplitIds = (expense.expense_splits ?? []).map((split: any) => split.user_id);
    if (expense.expense_type === "collective" && currentSplitIds.length > 0) {
      setSplitMode("manual");
      setSelectedParticipantIds(currentSplitIds);
    }

    const isStandardCat = CATEGORIES.some((c) => c.value === expense.category);
    if (isStandardCat) {
      setCategory(expense.category);
    } else {
      setCategory("other");
      setCustomCategory(expense.category);
    }
    setOpen(true);
  };

  const openEditRecurring = (recurring: any) => {
    resetForm();
    setEditingType("recurring");
    setEditingId(recurring.id);
    setTitle(recurring.title);
    setAmount(String(recurring.amount));
    setDescription(recurring.description || "");
    setDateValue(recurring.next_due_date);

    const isStandardCat = CATEGORIES.some((c) => c.value === recurring.category);
    if (isStandardCat) {
      setCategory(recurring.category);
    } else {
      setCategory("other");
      setCustomCategory(recurring.category);
    }
    setOpen(true);
  };

  const decoratedExpenses = useMemo(() => {
    return allExpenses.map((e) => {
      const inst = installmentByExpenseId.get(e.id);
      if (!inst) return e;

      return {
        ...e,
        _installment_number: inst.installment_number,
        _installment_amount: inst.amount,
        _is_installment: true,
      };
    });
  }, [allExpenses, installmentByExpenseId]);

  const filteredAll = (decoratedExpenses ?? []).filter((e: any) => {
    if (e.expense_type === "collective") return true;
    if (e.created_by === user?.id) return true;
    const splits = (e.expense_splits as any[]) || [];
    return splits.some((s: any) => s.user_id === user?.id);
  });

  const filteredMine = (decoratedExpenses ?? []).filter((e: any) => {
    if (e.expense_type !== "individual") return false;
    if (e.created_by === user?.id) return true;
    const splits = (e.expense_splits as any[]) || [];
    return splits.some((s: any) => s.user_id === user?.id);
  });

  const filteredCollective = (decoratedExpenses ?? []).filter((e: any) => e.expense_type === "collective");

  const lowerSearchTerm = searchTerm.toLowerCase().trim();
  const filterBySearch = (e: any) => {
    if (!lowerSearchTerm) return true;
    const catLabel = CATEGORIES.find((c) => c.value === e.category)?.label ?? e.category;
    return (
      e.title?.toLowerCase().includes(lowerSearchTerm) ||
      catLabel.toLowerCase().includes(lowerSearchTerm)
    );
  };

  const finalFilteredAll = filteredAll.filter(filterBySearch);
  const finalFilteredMine = filteredMine.filter(filterBySearch);
  const finalFilteredCollective = filteredCollective.filter(filterBySearch);
  const finalRecurring = recurringExpenses?.filter(filterBySearch);

  const handleEditClick = (expense: any) => {
    if (expense._is_installment && expense.installments > 1) {
      setEditConfirmExpense(expense);
    } else {
      openEditExpense(expense);
    }
  };

  const handleDeleteClick = (expense: any) => {
    if (expense._is_installment && expense.installments > 1) {
      setDeleteConfirmExpense(expense);
    } else {
      deleteExpenseMutation.mutate(expense.id);
    }
  };

  const toggleParticipant = (participantId: string) => {
    setSelectedParticipantIds((prev) =>
      prev.includes(participantId) ? prev.filter((id) => id !== participantId) : [...prev, participantId],
    );
  };

  const registerPaymentMutation = useMutation({
    mutationFn: async ({
      expense,
      payerId,
      paymentDateValue,
      proofFile,
    }: {
      expense: ExpenseRow;
      payerId: string;
      paymentDateValue: string;
      proofFile: File;
    }) => {
      const ext = proofFile.name.split(".").pop() ?? "jpg";
      const path = `${user!.id}/${Date.now()}_expense_payment.${ext}`;
      const { error: uploadError } = await supabase.storage.from("receipts").upload(path, proofFile);
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from("receipts").getPublicUrl(path);
      const payerName = payerId === "me"
        ? "Você"
        : participantOptions.find((participant) => participant.id === payerId)?.name || "Morador";
      const historyLine = `quitada por ${payerName} em ${format(parseLocalDate(paymentDateValue), "dd/MM")}`;
      const updatedDescription = expense.description
        ? `${expense.description}\n${historyLine}`
        : historyLine;

      const { error: updateError } = await supabase
        .from("expenses")
        .update({
          paid_to_provider: true,
          due_date: paymentDateValue,
          receipt_url: publicUrlData.publicUrl,
          description: updatedDescription,
        })
        .eq("id", expense.id);
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      setQuickPayExpense(null);
      setQuickPayerUserId("me");
      setQuickPaymentDate(format(new Date(), "yyyy-MM-dd"));
      setQuickReceiptFile(null);
      toast({ title: "Pagamento registrado com sucesso." });
    },
    onError: (err: any) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  const handleQuickRegisterPayment = () => {
    if (!quickPayExpense) return;
    if (!quickPaymentDate) {
      toast({ title: "Erro", description: "Informe a data do pagamento.", variant: "destructive" });
      return;
    }
    if (!quickReceiptFile) {
      toast({ title: "Erro", description: "Anexe o comprovante.", variant: "destructive" });
      return;
    }

    registerPaymentMutation.mutate({
      expense: quickPayExpense,
      payerId: quickPayerUserId,
      paymentDateValue: quickPaymentDate,
      proofFile: quickReceiptFile,
    });
  };

  if (loadingExpenses || loadingRecurring || loading) {
    return (
      <div className="flex justify-center py-12">
        <CustomLoader className="h-6 w-6 text-primary" />
      </div>
    );
  }

  const tabTriggerClass = "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm text-foreground/60 text-xs font-semibold px-3 py-1.5 rounded-md transition-all";
  const tabListClass = "w-full justify-start overflow-x-auto bg-muted/50 rounded-lg p-1 h-auto gap-1";

  const compactTabsList = (
    <TabsList className={tabListClass}>
      <TabsTrigger value="all" className={tabTriggerClass}>Todas</TabsTrigger>
      <TabsTrigger value="mine" className={tabTriggerClass}>Minhas</TabsTrigger>
      <TabsTrigger value="collective" className={tabTriggerClass}>Coletivas</TabsTrigger>
      <TabsTrigger value="recurring" className={cn(tabTriggerClass, "gap-1.5")}>
        <RefreshCw className="h-3 w-3" /> Recorrentes
      </TabsTrigger>
    </TabsList>
  );

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
    <div className="space-y-4">
      <PageHero
        compactTabs={compactTabsList}
        onCompactChange={setHeroCompact}
        title="Despesas"
        subtitle="Gestão financeira do grupo"
        tone="primary"
        icon={<Receipt className="h-4 w-4" />}
        actions={
          <div className="flex w-full flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            <div className="flex h-10 w-full sm:w-auto items-center justify-between rounded-lg border bg-card p-1 shadow-sm">
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
            <Button className="h-10 w-full sm:w-auto gap-2" onClick={() => { resetForm(); setOpen(true); }}>
              <Plus className="h-4 w-4" /> Nova Despesa
            </Button>
          </div>
        }
      />

      <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); setOpen(v); }}>
          <DialogContent className="max-w-lg p-0 gap-0 flex flex-col overflow-hidden max-h-[90vh]">
            <DialogHeader className="px-6 pt-6 pb-4 shrink-0 border-b bg-background">
              <DialogTitle className="font-serif">
                {editingId ? (editingType === "recurring" ? "Editar Recorrência" : "Editar Despesa") : "Nova Despesa"}
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <div className="space-y-2">
                <Label>Título</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Mercado Mensal" maxLength={200} />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Valor Total (R$)</Label>
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

              {editingType === "expense" && (
                <div className="space-y-3">
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
                    <div>
                      <Label className="text-base font-medium">2. Status com fornecedor</Label>
                      <p className="text-xs text-muted-foreground">
                        Indica se a conta principal (ex: boleto de luz) já foi paga à empresa.
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant={statusWithProvider === "pending" ? "default" : "outline"}
                        onClick={() => setStatusWithProvider("pending")}
                      >
                        Pendente
                      </Button>
                      <Button
                        type="button"
                        variant={statusWithProvider === "paid" ? "default" : "outline"}
                        onClick={() => setStatusWithProvider("paid")}
                      >
                        Paga
                      </Button>
                    </div>
                    
                    {paymentMethod !== "credit_card" && !editingId && (
                      <div className="pt-3 border-t space-y-2">
                        <div className="flex items-center gap-2">
                          <Switch checked={isPaid} onCheckedChange={setIsPaid} id="paid-switch" />
                          <Label htmlFor="paid-switch" className="cursor-pointer text-sm">Marcar rateio como pago</Label>
                        </div>
                        <p className="text-xs text-muted-foreground pl-11">
                          Ative se os participantes já te reembolsaram. Isso marcará a parte de todos como 'paga' no sistema.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="rounded-lg border bg-muted/20 p-3 space-y-3">
                    <Label className="text-base font-medium">3. Pagamento</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Forma</Label>
                        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {PAYMENT_METHODS.map((p) => (
                              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Quem pagou</Label>
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
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Data do pagamento/compra</Label>
                        <Input
                          type="date"
                          value={dateValue}
                          onChange={(e) => {
                            setDateValue(e.target.value);
                            setPaymentDate(e.target.value);
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Comprovante</Label>
                        <Input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                        />
                        {receiptUrl && (
                          <a href={receiptUrl} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">
                            Ver comprovante atual
                          </a>
                        )}
                      </div>
                    </div>
                    {editingType === "expense" && editingId && (
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Competência</Label>
                        <Input
                          type="month"
                          value={editCompetence}
                          onChange={(e) => setEditCompetence(e.target.value)}
                        />
                      </div>
                    )}

                    {paymentMethod === "credit_card" && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Cartão</Label>
                          <Select value={creditCardId} onValueChange={setCreditCardId}>
                            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                            <SelectContent>
                              {cards.length === 0 && <SelectItem value="none" disabled>Nenhum cartão</SelectItem>}
                              {cards.map((c) => (
                                <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Parcelas</Label>
                          <div className="flex items-center gap-2">
                            <Input type="number" min="1" max="36" value={installments} onChange={(e) => setInstallments(e.target.value)} className="w-24" />
                            <span className="text-sm text-muted-foreground">
                              x de R$ {(Number(amount) / (parseInt(installments) || 1)).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="rounded-lg border bg-muted/20 p-3 space-y-3">
                    <Label className="text-base font-medium">4. Participantes do rateio</Label>
                    {expenseType === "individual" ? (
                      <p className="text-sm text-muted-foreground">
                        Despesa individual: somente você participa do rateio.
                      </p>
                    ) : (
                      <>
                        <div className="grid grid-cols-3 gap-2">
                          <Button type="button" variant={splitMode === "all" ? "default" : "outline"} onClick={() => setSplitMode("all")}>
                            Todos
                          </Button>
                          <Button type="button" variant={splitMode === "manual" ? "default" : "outline"} onClick={() => setSplitMode("manual")}>
                            Manual
                          </Button>
                          <Button type="button" variant={splitMode === "exact" ? "default" : "outline"} onClick={() => setSplitMode("exact")}>
                            Exato
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
                        {splitMode === 'exact' && (
                          <div className="space-y-3 pt-3">
                            <div className="space-y-2 border rounded-md p-2 max-h-40 overflow-y-auto">
                              {participantOptions.map((participant) => (
                                <div key={participant.id} className="flex items-center gap-3">
                                  <Label className="flex-1">{participant.name}</Label>
                                  <Input
                                    type="number"
                                    placeholder="0,00"
                                    className="w-24"
                                    value={exactSplitAmounts[participant.id] || ''}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      setExactSplitAmounts(prev => ({ ...prev, [participant.id]: value }));
                                    }}
                                  />
                                </div>
                              ))}
                            </div>
                            <div className={cn(
                              "text-xs font-medium text-right",
                              exactSplitRemaining === 0 ? "text-green-600" : "text-destructive"
                            )}>
                              {exactSplitRemaining === 0
                                ? `Total bate com R$ ${Number(amount).toFixed(2)}`
                                : `Faltam R$ ${exactSplitRemaining.toFixed(2)} para fechar`
                              }
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              {editingType === "expense" && (
                <div className="rounded-lg border bg-primary/5 p-3 space-y-2">
                  <Label className="text-sm font-semibold">Resumo instantâneo</Label>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>
                      <strong>Participantes:</strong> {effectiveParticipantIds.length}
                    </p>
                    {splitMode !== 'exact' && (
                      <p>
                        <strong>Cota por pessoa:</strong> R$ {perPersonQuota.toFixed(2)}
                      </p>
                    )}
                    <p>
                      <strong>Quem será reembolsado:</strong> {payerLabel}
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-2 pt-2 border-t">
                <Label>Descrição (opcional)</Label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detalhes adicionais" />
              </div>

              {!editingId && editingType === "expense" && (
                <div className="rounded-lg border p-3 bg-muted/30 space-y-3">
                  <div className="flex items-center gap-2">
                    <Switch checked={isRecurring} onCheckedChange={setIsRecurring} id="recurring-switch" />
                    <Label htmlFor="recurring-switch" className="cursor-pointer">Repetir mensalmente?</Label>
                  </div>

                  {isRecurring && (
                    <div className="space-y-2 animate-accordion-down">
                      <Label>Dia do Vencimento (mensal)</Label>
                      <Input type="number" min="1" max="31" value={recurrenceDay} onChange={(e) => setRecurrenceDay(e.target.value)} />
                    </div>
                  )}
                </div>
              )}

            </div>
            <div className="px-6 pb-6 pt-4 shrink-0 border-t bg-background">
              <Button onClick={handleSave} disabled={saving} className="w-full">
                {saving ? <CustomLoader className="h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                {editingId ? "Atualizar" : "Salvar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog
          open={!!quickPayExpense}
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              setQuickPayExpense(null);
            }
          }}
        >
          <DialogContent className="max-w-md p-0 gap-0 flex flex-col overflow-hidden max-h-[85vh]">
            <DialogHeader className="px-6 pt-6 pb-4 shrink-0 border-b bg-background">
              <DialogTitle className="font-serif">Registrar pagamento</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Despesa</Label>
                <p className="text-sm font-medium">{quickPayExpense?.title}</p>
              </div>
              <div className="space-y-2">
                <Label>Pagador</Label>
                <Select value={quickPayerUserId} onValueChange={setQuickPayerUserId}>
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
              <div className="space-y-2">
                <Label>Data</Label>
                <Input type="date" value={quickPaymentDate} onChange={(e) => setQuickPaymentDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Comprovante</Label>
                <Input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setQuickReceiptFile(e.target.files?.[0] || null)}
                />
              </div>
            </div>
            <div className="px-6 pb-6 pt-4 shrink-0 border-t bg-background">
              <Button
                onClick={handleQuickRegisterPayment}
                disabled={registerPaymentMutation.isPending}
                className="w-full"
              >
                {registerPaymentMutation.isPending ? <CustomLoader className="h-4 w-4 mr-2" /> : null}
                Confirmar pagamento
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!editConfirmExpense} onOpenChange={(v) => { if (!v) setEditConfirmExpense(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Editar despesa parcelada</AlertDialogTitle>
              <AlertDialogDescription>
                Esta despesa possui {editConfirmExpense?.installments} parcelas. A edição afetará a despesa e <strong>todas as parcelas</strong> serão recalculadas. Deseja continuar?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => {
                const exp = editConfirmExpense;
                setEditConfirmExpense(null);
                openEditExpense(exp);
              }}>
                Editar despesa completa
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={!!deleteConfirmExpense} onOpenChange={(v) => { if (!v) setDeleteConfirmExpense(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir despesa parcelada?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta despesa possui {deleteConfirmExpense?.installments} parcelas. Ao excluir, <strong>todas as parcelas</strong> serão removidas. Essa ação não pode ser desfeita. Deseja continuar?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  const id = deleteConfirmExpense?.id;
                  setDeleteConfirmExpense(null);
                  if (id) deleteExpenseMutation.mutate(id);
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Excluir todas as parcelas
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      <div className="text-sm text-muted-foreground">
        Exibindo competência: <strong>{format(cycleStart, "dd/MM")}</strong> até{" "}
        <strong>{format(subDays(cycleEnd, 1), "dd/MM")}</strong>
      </div>

      {!heroCompact && (
        <TabsList className={tabListClass}>
          <TabsTrigger value="all" className={tabTriggerClass}>Todas</TabsTrigger>
          <TabsTrigger value="mine" className={tabTriggerClass}>Minhas</TabsTrigger>
          <TabsTrigger value="collective" className={tabTriggerClass}>Coletivas</TabsTrigger>
          <TabsTrigger value="recurring" className={cn(tabTriggerClass, "gap-1.5")}>
            <RefreshCw className="h-3 w-3" /> Recorrentes
          </TabsTrigger>
        </TabsList>
      )}

      <div className="relative z-20">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar despesas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
            className="pl-9 pr-9 bg-card"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        
        {isSearchFocused && debouncedSearch && globalSearchResults.length > 0 && (
          <Card className="absolute top-full left-0 right-0 mt-1 shadow-lg border-border overflow-hidden">
            <div className="p-2 bg-muted/30 border-b">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Em outras competências
              </p>
            </div>
            <div className="max-h-[300px] overflow-y-auto">
              {globalSearchResults.map((res: any) => {
                const d = parseLocalDate(res.purchase_date);
                const [y, m] = res.competence_key ? res.competence_key.split('-') : [d.getFullYear(), d.getMonth() + 1];
                return (
                  <button
                    key={res.id}
                    className="w-full text-left px-4 py-3 hover:bg-muted/50 border-b last:border-0 transition-colors flex items-center justify-between"
                    onClick={() => {
                      setCurrentDate(new Date(Number(y), Number(m) - 1, 15));
                      setIsSearchFocused(false);
                    }}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{res.title}</p>
                      <p className="text-xs text-muted-foreground flex gap-2">
                        <span>{format(d, "dd/MM/yyyy", { locale: ptBR })}</span>
                        <span>•</span>
                        <span className="font-medium text-primary">Comp. {res.competence_key}</span>
                      </p>
                    </div>
                    <div className="text-sm font-semibold whitespace-nowrap ml-4">
                      R$ {Number(res.amount).toFixed(2)}
                    </div>
                  </button>
                )
              })}
            </div>
          </Card>
        )}
      </div>

      <TabsContent value="all" className="space-y-3 mt-4">
        {finalFilteredAll.length === 0 && <p className="text-center text-muted-foreground py-8">Nenhuma despesa encontrada nesta competência.</p>}
        {finalFilteredAll.map((e: any) => (
          <ExpenseCard
            key={e.id}
            expense={e}
            userId={user?.id}
            isAdmin={isAdmin}
            cards={cards}
            onEdit={() => handleEditClick(e)}
            onDelete={() => handleDeleteClick(e)}
            onRegisterPayment={() => {
              setQuickPayExpense(e);
              setQuickPayerUserId("me");
              setQuickPaymentDate(format(new Date(), "yyyy-MM-dd"));
              setQuickReceiptFile(null);
            }}
          />
        ))}
      </TabsContent>

      <TabsContent value="mine" className="space-y-3 mt-4">
        {finalFilteredMine.length === 0 && <p className="text-center text-muted-foreground py-8">Nenhuma despesa individual encontrada nesta competência.</p>}
        {finalFilteredMine.map((e: any) => (
          <ExpenseCard
            key={e.id}
            expense={e}
            userId={user?.id}
            isAdmin={isAdmin}
            cards={cards}
            onEdit={() => handleEditClick(e)}
            onDelete={() => handleDeleteClick(e)}
            onRegisterPayment={() => {
              setQuickPayExpense(e);
              setQuickPayerUserId("me");
              setQuickPaymentDate(format(new Date(), "yyyy-MM-dd"));
              setQuickReceiptFile(null);
            }}
          />
        ))}
      </TabsContent>

      <TabsContent value="collective" className="space-y-3 mt-4">
        {finalFilteredCollective.length === 0 && <p className="text-center text-muted-foreground py-8">Nenhuma despesa coletiva encontrada nesta competência.</p>}
        {finalFilteredCollective.map((e: any) => (
          <ExpenseCard
            key={e.id}
            expense={e}
            userId={user?.id}
            isAdmin={isAdmin}
            cards={cards}
            onEdit={() => handleEditClick(e)}
            onDelete={() => handleDeleteClick(e)}
            onRegisterPayment={() => {
              setQuickPayExpense(e);
              setQuickPayerUserId("me");
              setQuickPaymentDate(format(new Date(), "yyyy-MM-dd"));
              setQuickReceiptFile(null);
            }}
          />
        ))}
      </TabsContent>

      <TabsContent value="recurring" className="space-y-3 mt-4">
        <div className="flex items-center justify-between bg-muted/30 p-3 rounded-lg border border-border/50 mb-4">
          <div>
            <h3 className="text-sm font-medium">Despesas Recorrentes</h3>
            <p className="text-xs text-muted-foreground">Contas mensais fixas e assinaturas</p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/recurring">
              <Settings className="mr-2 h-3.5 w-3.5" />
              Gerenciar
            </Link>
          </Button>
        </div>

        {!finalRecurring?.length && <p className="text-center text-muted-foreground py-8">Nenhuma recorrência configurada.</p>}
        {finalRecurring?.map((r: any) => (
          <RecurringCard key={r.id} recurring={r} isAdmin={isAdmin} userId={user?.id} onEdit={() => openEditRecurring(r)} onDelete={() => deleteRecurring.mutate(r.id)} />
        ))}
      </TabsContent>
    </div>
    </Tabs>
  );
}

function ExpenseCard({ expense, userId, isAdmin, cards, onEdit, onDelete, onRegisterPayment }: any) {
  const catLabel = CATEGORIES.find((c) => c.value === expense.category)?.label ?? expense.category;
  const mySplit = expense.expense_splits?.find((s: any) => s.user_id === userId);
  const cardLabel = cards.find((c: any) => c.id === expense.credit_card_id)?.label;
  const canManage = isAdmin || expense.created_by === userId;
  const paymentHistory = (expense.description ?? "")
    .split("\n")
    .map((line: string) => line.trim())
    .reverse()
    .find((line: string) => line.toLowerCase().startsWith("quitada por "));

  const isInstallment = expense._is_installment && expense.installments > 1;
  const displayAmount = isInstallment ? expense._installment_amount : expense.amount;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <p className="font-medium">{expense.title}</p>
              <Badge variant="outline" className="text-xs">{catLabel}</Badge>
              <Badge
                variant={expense.expense_type === "collective" ? "default" : "secondary"}
                className="text-xs"
              >
                {expense.expense_type === "collective" ? "Coletiva" : "Individual"}
              </Badge>
              {isInstallment && (
                <Badge variant="outline" className="text-xs border-primary/50 text-primary">
                  Parcela {expense._installment_number}/{expense.installments}
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-2">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" /> {format(parseLocalDate(expense.purchase_date), "dd/MM/yyyy")}
              </span>
              <Badge variant={expense.paid_to_provider ? "default" : "secondary"} className="text-[10px]">
                {expense.paid_to_provider ? "Paga ao fornecedor" : "Pendente com fornecedor"}
              </Badge>
              {expense.payment_method === "credit_card" && (
                <span>
                  <CreditCard className="h-3 w-3 inline mr-1" /> {cardLabel}{" "}
                  {expense.installments > 1 && `(${expense.installments}x)`}
                </span>
              )}
            </div>
            {paymentHistory && (
              <p className="text-xs text-muted-foreground mt-2">
                {paymentHistory}
              </p>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className="text-lg font-bold">R$ {Number(displayAmount).toFixed(2)}</p>
            {isInstallment && (
              <p className="text-[10px] text-muted-foreground">Total: R$ {Number(expense.amount).toFixed(2)}</p>
            )}
            {mySplit && expense.expense_type === "collective" && (
              <Badge variant="secondary" className="text-[10px]">
                Sua parte: R$ {Number(mySplit.amount).toFixed(2)}
              </Badge>
            )}
            {!expense.paid_to_provider && canManage && (
              <Button
                variant="outline"
                size="sm"
                className="mt-2 h-7 text-xs"
                onClick={onRegisterPayment}
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Registrar pagamento
              </Button>
            )}
          </div>
          {canManage && (
            <div className="flex flex-col gap-1 ml-2">
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onEdit}>
                <Edit className="h-4 w-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir despesa?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza que deseja excluir esta despesa? Essa ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function RecurringCard({ recurring, isAdmin, userId, onEdit, onDelete }: any) {
  const catLabel = CATEGORIES.find((c) => c.value === recurring.category)?.label ?? recurring.category;
  const canManage = isAdmin || recurring.created_by === userId;

  return (
    <Card className="border-l-4 border-l-primary">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <p className="font-medium">{recurring.title}</p>
              <Badge variant="outline" className="text-xs">{catLabel}</Badge>
              <Badge variant={recurring.expense_type === "collective" ? "default" : "secondary"} className="text-xs">
                {recurring.expense_type === "collective" ? "Coletiva" : "Individual"}
              </Badge>
              <Badge variant={recurring.active ? "default" : "secondary"} className="text-xs">
                {recurring.active ? "Ativa" : "Pausada"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Próximo vencimento: {format(parseLocalDate(recurring.next_due_date), "dd/MM/yyyy")}
            </p>
          </div>
          <div className="text-right shrink-0 flex flex-col items-end gap-2">
            <p className="text-lg font-bold">R$ {Number(recurring.amount).toFixed(2)}</p>
            <p className="text-[10px] text-muted-foreground uppercase">Mensal</p>
          </div>
          {canManage && (
            <div className="flex items-center gap-1 mt-1">
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onEdit}>
                <Edit className="h-4 w-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir recorrência?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza que deseja excluir "{recurring.title}"? Novas despesas não serão geradas automaticamente.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}'''