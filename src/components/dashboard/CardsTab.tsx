import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wallet, CreditCard, Plus, PieChart as PieChartIcon, Settings, Trash2 } from "lucide-react";
import { CustomLoader } from "@/components/ui/custom-loader";
import { Link } from "react-router-dom";
import { format, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CHART_COLORS, CATEGORY_COLORS, getCategoryLabel } from "@/constants/categories";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { cn, parseLocalDate } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
} from "@/components/ui/alert-dialog";

interface CardsTabProps {
  totalBill: number;
  currentDate: Date;
  cardsChartData: any[];
  creditCards: any[];
  cardsBreakdown: Record<string, number>;
  billInstallments: any[];
  isLoading?: boolean;
}

const cardSchema = z.object({
  label: z.string().min(3, "Informe o apelido do cartão"),
  brand: z.string().min(1, "Selecione a bandeira"),
  closing_day: z.coerce.number().int().min(1).max(31),
  due_day: z.coerce.number().int().min(1).max(31),
  limit_amount: z
    .string()
    .optional()
    .refine(
      (value) => !value || (!Number.isNaN(Number(value)) && Number(value) >= 0),
      "Informe um limite válido",
    ),
});

type CardFormValues = z.infer<typeof cardSchema>;

const brandOptions = [
  { value: "visa", label: "Visa" },
  { value: "mastercard", label: "Mastercard" },
  { value: "elo", label: "Elo" },
  { value: "hipercard", label: "Hipercard" },
  { value: "american_express", label: "American Express" },
  { value: "outros", label: "Outros" },
];

export function CardsTab({
  totalBill,
  currentDate,
  cardsChartData,
  creditCards,
  cardsBreakdown,
  billInstallments,
  isLoading = false,
}: CardsTabProps) {
  const { user, membership } = useAuth();
  const queryClient = useQueryClient();
  const [hoveredSegmentLabel, setHoveredSegmentLabel] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<any | null>(null);
  const [addCardOpen, setAddCardOpen] = useState(false);
  const [editCardOpen, setEditCardOpen] = useState(false);
  const [deletingCard, setDeletingCard] = useState<any | null>(null);

  const form = useForm<CardFormValues>({
    resolver: zodResolver(cardSchema),
    defaultValues: {
      label: "",
      brand: "",
      closing_day: 5,
      due_day: 10,
      limit_amount: "",
    },
  });

  const createCard = useMutation({
    mutationFn: async (values: CardFormValues) => {
      const limitAmount = values.limit_amount ? Number(values.limit_amount) : null;
      const { error } = await supabase.from("credit_cards").insert({
        user_id: user!.id,
        label: values.label.trim(),
        brand: values.brand,
        closing_day: values.closing_day,
        due_day: values.due_day,
        limit_amount: limitAmount,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-credit-cards"] });
      queryClient.invalidateQueries({ queryKey: ["credit-cards"] });
      form.reset({ label: "", brand: "", closing_day: 5, due_day: 10, limit_amount: "" });
      setAddCardOpen(false);
      toast({ title: "Cartão salvo", description: "Cartão adicionado com sucesso." });
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const onSubmitNewCard = (values: CardFormValues) => {
    createCard.mutate(values);
  };

  const handleOpenEdit = (card: any) => {
    form.reset({
      label: card.label,
      brand: card.brand,
      closing_day: card.closing_day,
      due_day: card.due_day,
      limit_amount: card.limit_amount ? String(card.limit_amount) : "",
    });
    setSelectedCard(card);
    setEditCardOpen(true);
  };

  const updateCard = useMutation({
    mutationFn: async (values: CardFormValues) => {
      const limitAmount = values.limit_amount ? Number(values.limit_amount) : null;
      const { error } = await supabase.from("credit_cards").update({
        label: values.label.trim(),
        brand: values.brand,
        closing_day: values.closing_day,
        due_day: values.due_day,
        limit_amount: limitAmount,
      }).eq("id", selectedCard!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-credit-cards"] });
      queryClient.invalidateQueries({ queryKey: ["credit-cards"] });
      setEditCardOpen(false);
      setSelectedCard(null);
      form.reset({ label: "", brand: "", closing_day: 5, due_day: 10, limit_amount: "" });
      toast({ title: "Cartão atualizado", description: "Alterações salvas." });
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const deleteCard = useMutation({
    mutationFn: async (cardId: string) => {
      const { error } = await supabase.from("credit_cards").delete().eq("id", cardId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-credit-cards"] });
      queryClient.invalidateQueries({ queryKey: ["credit-cards"] });
      setDeletingCard(null);
      toast({ title: "Cartão excluído" });
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const lastSixMonths = useMemo(
    () => Array.from({ length: 6 }, (_, index) => subMonths(currentDate, 5 - index)),
    [currentDate],
  );

  const { data: lastSixMonthsCardsData = [], isLoading: isLoadingLastSixMonthsCardsData } = useQuery({
    queryKey: [
      "cards-last-six-months",
      user?.id,
      membership?.group_id,
      currentDate.getMonth(),
      currentDate.getFullYear(),
    ],
    queryFn: async () => {
      const months = lastSixMonths.map((date) => date.getMonth() + 1);
      const years = Array.from(new Set(lastSixMonths.map((date) => date.getFullYear())));
      const monthKeys = new Set(lastSixMonths.map((date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`));

      const [groupRes, personalRes] = await Promise.all([
        supabase
          .from("expense_installments" as any)
          .select("amount, bill_month, bill_year, expenses!inner(expense_type, group_id, credit_card_id)")
          .eq("user_id", user!.id)
          .eq("expenses.group_id", membership!.group_id)
          .in("bill_month", months)
          .in("bill_year", years)
          .limit(5000),
        supabase
          .from("personal_expense_installments")
          .select("amount, bill_month, bill_year, personal_expenses(credit_card_id)")
          .eq("user_id", user!.id)
          .in("bill_month", months)
          .in("bill_year", years)
          .limit(5000),
      ]);

      if (groupRes.error) throw groupRes.error;
      if (personalRes.error) throw personalRes.error;

      // Map format: { "2024-01": { "card_id_1": 500, "card_id_2": 300 } }
      const totalsByMonth = new Map<string, Record<string, number>>();
      monthKeys.forEach((key) => {
        totalsByMonth.set(key, {});
      });

      (groupRes.data as any[] ?? []).forEach((item: any) => {
        const month = Number(item.bill_month);
        const year = Number(item.bill_year);
        const key = `${year}-${String(month).padStart(2, "0")}`;
        const bucket = totalsByMonth.get(key);
        const amount = Number(item.amount) || 0;
        const cardId = item.expenses?.credit_card_id;
        if (!bucket || !cardId) return;

        bucket[cardId] = (bucket[cardId] || 0) + amount;
      });

      (personalRes.data as any[] ?? []).forEach((item: any) => {
        const month = Number(item.bill_month);
        const year = Number(item.bill_year);
        const key = `${year}-${String(month).padStart(2, "0")}`;
        const bucket = totalsByMonth.get(key);
        const amount = Number(item.amount) || 0;
        const cardId = item.personal_expenses?.credit_card_id;
        if (!bucket || !cardId) return;

        bucket[cardId] = (bucket[cardId] || 0) + amount;
      });

      return lastSixMonths.map((date) => {
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        const monthValues = totalsByMonth.get(key) ?? {};

        return {
          monthLabel: format(date, "MMM/yy", { locale: ptBR }),
          ...monthValues,
        };
      });
    },
    enabled: !!user?.id && !!membership?.group_id,
    staleTime: 60_000,
  });

  const donutData = cardsChartData.map((entry, index) => ({
    label: entry.name,
    value: entry.value,
    color: CATEGORY_COLORS[entry.name] || CHART_COLORS[index % CHART_COLORS.length],
  }));

  const activeSegment = donutData.find(d => d.label === hoveredSegmentLabel);
  const displayValue = activeSegment ? activeSegment.value : totalBill;
  const displayLabel = activeSegment ? activeSegment.label : "Total Fatura";
  const displayPercentage = activeSegment && totalBill > 0 ? (activeSegment.value / totalBill) * 100 : 100;

  const selectedCardInstallments = selectedCard
    ? billInstallments.filter((i: any) => i.expenses?.credit_card_id === selectedCard.id)
    : [];

  const sortedSelectedCardInstallments = [...selectedCardInstallments].sort((a: any, b: any) => {
    const dateA = a.expenses?.purchase_date || "";
    const dateB = b.expenses?.purchase_date || "";

    return dateB.localeCompare(dateA);
  });

  const selectedCardTotal = selectedCardInstallments.reduce((sum: number, i: any) => sum + Number(i.amount), 0);
  const selectedCardIndividualTotal = selectedCardInstallments
    .filter((i: any) => i.expenses?.expense_type === "individual" || i.expenses?.expense_type === "personal")
    .reduce((sum: number, i: any) => sum + Number(i.amount), 0);
  const selectedCardCollectiveBaseTotal = selectedCardInstallments
    .filter((i: any) => i.expenses?.expense_type === "collective")
    .reduce((sum: number, i: any) => sum + Number(i.amount), 0);
  const selectedCardUncategorizedTotal = Math.max(0, selectedCardTotal - (selectedCardIndividualTotal + selectedCardCollectiveBaseTotal));
  const selectedCardCollectiveTotal = selectedCardCollectiveBaseTotal + selectedCardUncategorizedTotal;
  const selectedCardIndividualPercentage = selectedCardTotal > 0 ? (selectedCardIndividualTotal / selectedCardTotal) * 100 : 0;
  const selectedCardCollectivePercentage = selectedCardTotal > 0 ? (selectedCardCollectiveTotal / selectedCardTotal) * 100 : 0;

  const formatCurrency = (value: number) =>
    value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const sortedInstallments = [...billInstallments].sort((a: any, b: any) => {
    const dateA = a.expenses?.purchase_date || "";
    const dateB = b.expenses?.purchase_date || "";
    return dateB.localeCompare(dateA);
  });

  const globalIndividualTotal = billInstallments
    .filter((i: any) => i.expenses?.expense_type === "individual" || i.expenses?.expense_type === "personal")
    .reduce((sum: number, i: any) => sum + Number(i.amount), 0);

  const globalCollectiveBaseTotal = billInstallments
    .filter((i: any) => i.expenses?.expense_type === "collective")
    .reduce((sum: number, i: any) => sum + Number(i.amount), 0);
    
  const globalUncategorizedTotal = Math.max(0, totalBill - (globalIndividualTotal + globalCollectiveBaseTotal));
  const globalCollectiveTotal = globalCollectiveBaseTotal + globalUncategorizedTotal;

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid gap-4 md:grid-cols-3">
        {/* Total em Faturas - DESTAQUE PREMIUM */}
        <Card className="relative overflow-hidden border-0 md:col-span-1 flex flex-col justify-between bg-primary shadow-xl shadow-primary/20 min-h-[220px]">
          {/* Premium Background Effects */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent mix-blend-overlay pointer-events-none" />
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-black/10 blur-3xl pointer-events-none" />
          
          {/* Watermark Icon to fill empty space */}
          <CreditCard className="absolute -bottom-6 -right-6 w-48 h-48 text-black/5 pointer-events-none transform -rotate-12" />

          <CardHeader className="relative z-10 pb-0 pt-6 px-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs sm:text-sm font-bold text-white/90 uppercase tracking-widest drop-shadow-sm">
                Total em Faturas
              </CardTitle>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-md shadow-inner border border-white/20">
                <CreditCard className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative z-10 pt-6 pb-6 px-6 flex flex-col gap-4 mt-auto">
            <div>
              <div className="text-4xl lg:text-5xl font-bold tracking-tight text-white drop-shadow-sm mb-2">
                R$ {formatCurrency(totalBill)}
              </div>
              <span className="inline-block text-[10px] font-medium bg-black/20 text-white px-2.5 py-1 rounded-full backdrop-blur-md border border-white/10 capitalize">
                {format(currentDate, "MMMM yyyy", { locale: ptBR })}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-md border border-white/20 bg-white/10 px-2.5 py-2 backdrop-blur-md">
                <span className="block text-[10px] font-bold text-white/70 uppercase tracking-wider">Individuais</span>
                <span className="block text-sm font-extrabold text-white mt-0.5">R$ {formatCurrency(globalIndividualTotal)}</span>
              </div>
              <div className="rounded-md border border-white/20 bg-white/10 px-2.5 py-2 backdrop-blur-md">
                <span className="block text-[10px] font-bold text-white/70 uppercase tracking-wider">Coletivos</span>
                <span className="block text-sm font-extrabold text-white mt-0.5">R$ {formatCurrency(globalCollectiveTotal)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Composição da Fatura</CardTitle>
            <PieChartIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="h-auto flex flex-col md:flex-row items-center justify-center gap-6 p-4 md:p-6">
            {donutData.length > 0 ? (
              <>
                <div className="relative h-[220px] w-[220px] shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={donutData}
                        dataKey="value"
                        nameKey="label"
                        cx="50%"
                        cy="50%"
                        innerRadius={85}
                        outerRadius={110}
                        paddingAngle={5}
                        stroke="none"
                        cornerRadius={5}
                        onMouseEnter={(_, index) => setHoveredSegmentLabel(donutData[index].label)}
                        onMouseLeave={() => setHoveredSegmentLabel(null)}
                      >
                        {donutData.map((entry, i) => (
                          <Cell 
                            key={i} 
                            fill={entry.color} 
                            opacity={hoveredSegmentLabel === null || hoveredSegmentLabel === entry.label ? 1 : 0.3}
                            className="transition-opacity duration-200"
                            style={{ outline: "none" }}
                          />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none flex flex-col items-center justify-center w-full px-4">
                    <p className="text-muted-foreground text-[10px] font-medium truncate max-w-[140px] uppercase tracking-wider leading-tight">
                      {displayLabel}
                    </p>
                    <p className="text-lg font-bold text-foreground tabular-nums whitespace-nowrap">
                      R$ {displayValue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    {activeSegment && (
                      <p className="text-xs font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full mt-1">
                        {displayPercentage.toFixed(1)}%
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex-1 flex flex-col space-y-2 w-full overflow-y-auto max-h-[220px] pr-2 scrollbar-thin">
                  {donutData.map((segment) => (
                    <div
                      key={segment.label}
                      className={cn(
                        "flex items-center justify-between p-2 rounded-md transition-colors cursor-default text-sm gap-3",
                        hoveredSegmentLabel === segment.label ? "bg-muted" : "hover:bg-muted/50"
                      )}
                      onMouseEnter={() => setHoveredSegmentLabel(segment.label)}
                      onMouseLeave={() => setHoveredSegmentLabel(null)}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: segment.color }}
                        />
                        <span className="font-medium truncate text-muted-foreground" title={segment.label}>
                          {segment.label}
                        </span>
                      </div>
                      <span className="font-semibold tabular-nums shrink-0 whitespace-nowrap text-right text-foreground">
                        R$ {segment.value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center text-muted-foreground text-sm opacity-60 h-full w-full">
                <CreditCard className="h-8 w-8 mb-2 opacity-20" />
                <p>Fatura zerada neste mês</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold flex items-center gap-2 text-foreground/90">
            <CreditCard className="h-5 w-5 text-primary" /> Meus Cartões
          </h3>
          <Button size="sm" onClick={() => setAddCardOpen(true)} className="gap-1.5">
            <Plus className="h-4 w-4" /> Adicionar
          </Button>
        </div>
        
        {isLoading ? (
          <Card className="border-dashed bg-muted/20">
            <CardContent className="py-10 flex flex-col items-center justify-center text-center">
              <CustomLoader className="h-6 w-6 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">Carregando cartões...</p>
            </CardContent>
          </Card>
        ) : creditCards.length === 0 ? (
          <Card className="border-dashed bg-muted/20">
            <CardContent className="py-10 flex flex-col items-center justify-center text-center">
              <div className="bg-muted p-3 rounded-full mb-3">
                <CreditCard className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground font-medium mb-1">Nenhum cartão cadastrado</p>
              <p className="text-xs text-muted-foreground/70 mb-4 max-w-[200px]">Cadastre seus cartões para controlar as faturas automaticamente.</p>
              <Button variant="outline" onClick={() => setAddCardOpen(true)}>Cadastrar Cartão</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {creditCards.map(card => {
              const billValue = cardsBreakdown[card.id] || 0;
              const cardInstallments = billInstallments.filter((i: any) => i.expenses?.credit_card_id === card.id);
              const individualTotal = cardInstallments
                .filter((i: any) => i.expenses?.expense_type === "individual" || i.expenses?.expense_type === "personal")
                .reduce((sum: number, i: any) => sum + Number(i.amount), 0);
              const collectiveTotal = cardInstallments
                .filter((i: any) => i.expenses?.expense_type === "collective")
                .reduce((sum: number, i: any) => sum + Number(i.amount), 0);

              return (
                <Card
                  key={card.id}
                  className="flex flex-col justify-between hover:shadow-md transition-all border-l-4 border-l-primary/80 cursor-pointer"
                  onClick={() => {
                    if (editCardOpen || !!deletingCard) return;
                    setSelectedCard(card);
                  }}
                >
                  <CardHeader className="pb-2 pt-4 px-4">
                    <div className="flex justify-between items-start gap-3">
                      <div className="min-w-0">
                        <CardTitle className="text-base font-semibold truncate">{card.label}</CardTitle>
                        <p className="text-xs text-muted-foreground capitalize font-medium">{card.brand}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-border/60 bg-background hover:bg-muted transition-colors"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleOpenEdit(card);
                          }}
                          aria-label={`Editar cartão ${card.label}`}
                        >
                          <Settings className="h-4 w-4 text-muted-foreground" />
                        </button>
                        <button
                          type="button"
                          className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-border/60 bg-background hover:bg-destructive/10 hover:border-destructive/30 transition-colors"
                          onClick={(event) => {
                            event.stopPropagation();
                            setDeletingCard(card);
                          }}
                          aria-label={`Excluir cartão ${card.label}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="mb-4 mt-2">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Fatura Atual</p>
                      <p className="text-2xl font-bold text-primary">R$ {formatCurrency(billValue)}</p>
                    </div>

                    <div className="mb-3 grid grid-cols-2 gap-2">
                      <div className="rounded-md border border-emerald-500/40 bg-emerald-500/15 px-2 py-1.5">
                        <span className="block text-[10px] font-bold text-emerald-800 dark:text-emerald-300">Individuais</span>
                        <span className="block text-xs font-extrabold text-foreground mt-0.5">R$ {formatCurrency(individualTotal)}</span>
                      </div>
                      <div className="rounded-md border border-blue-500/40 bg-blue-500/15 px-2 py-1.5">
                        <span className="block text-[10px] font-bold text-blue-800 dark:text-blue-300">Coletivos</span>
                        <span className="block text-xs font-extrabold text-foreground mt-0.5">R$ {formatCurrency(collectiveTotal)}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px] bg-muted/40 p-2 rounded border border-border/50">
                      <div>
                        <span className="text-muted-foreground block">Fecha dia</span>
                        <span className="font-bold text-foreground">{card.closing_day}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Vence dia</span>
                        <span className="font-bold text-foreground">{card.due_day}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Card>
        <CardHeader className="pb-3 border-b bg-muted/5">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Lançamentos da Competência ({billInstallments.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ScrollArea className="h-[250px]">
            <div className="divide-y">
              {sortedInstallments.map((i: any, idx: number) => {
                const totalInstallments = i.expenses?.installments ?? 1;
                const isAVista = totalInstallments <= 1;
                const purchaseDate = i.expenses?.purchase_date;
                const cardLabel = creditCards.find((c: any) => c.id === i.expenses?.credit_card_id)?.label;
                return (
                  <div key={idx} className="flex justify-between items-center py-3 hover:bg-muted/10 px-2 -mx-2 transition-colors rounded-sm">
                    <div className="min-w-0 pr-4 flex flex-col gap-0.5">
                      <span className="text-sm font-medium truncate text-foreground/90">{i.expenses?.title}</span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] text-muted-foreground bg-muted inline-block w-fit px-1.5 rounded-sm">
                          {getCategoryLabel(i.expenses?.category || "other")}
                        </span>
                        {cardLabel && (
                          <span className="text-[10px] text-primary-foreground bg-primary inline-block w-fit px-1.5 rounded-sm font-medium">
                            {cardLabel}
                          </span>
                        )}
                        {purchaseDate && (
                          <span className="text-[10px] text-muted-foreground">
                            {format(new Date(purchaseDate + "T00:00:00"), "dd/MM/yyyy")}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-sm block">R$ {Number(i.amount).toFixed(2)}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {isAVista ? "À vista" : `Parc. ${i.installment_number}/${totalInstallments}`}
                      </span>
                    </div>
                  </div>
                );
              })}
              {billInstallments.length === 0 && (
                <div className="py-8 text-center text-muted-foreground text-sm flex flex-col items-center gap-2">
                  <div className="h-1 w-12 bg-border rounded-full opacity-50 mb-1"></div>
                  Nenhum lançamento nesta fatura.
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Gráfico de Evolução dos Cartões - Movido para o final */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium">Evolução de Gastos por Cartão (Últimos 6 meses)</CardTitle>
          <Wallet className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="pt-2">
          {isLoadingLastSixMonthsCardsData ? (
            <div className="flex min-h-[180px] items-center justify-center text-sm text-muted-foreground">
              <CustomLoader className="h-5 w-5 mr-2" />
              Carregando evolução dos cartões...
            </div>
          ) : creditCards.length === 0 ? (
            <div className="flex min-h-[160px] items-center justify-center text-sm text-muted-foreground">
              Cadastre cartões para visualizar o gráfico.
            </div>
          ) : (
            <div className="h-[290px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={lastSixMonthsCardsData}
                  margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="4 4" className="stroke-muted" vertical={false} />
                  <XAxis
                    dataKey="monthLabel"
                    tickLine={false}
                    axisLine={false}
                    interval={0}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11 }}
                    tickFormatter={(value) => `R$ ${Number(value).toLocaleString("pt-BR")}`}
                  />
                  <Tooltip
                    formatter={(value: number) => `R$ ${formatCurrency(Number(value))}`}
                    contentStyle={{
                      borderRadius: "0.5rem",
                      borderColor: "hsl(var(--border))",
                      backgroundColor: "hsl(var(--background))",
                    }}
                  />
                  {creditCards.map((card, index) => (
                    <Line
                      key={card.id}
                      type="monotone"
                      dataKey={card.id}
                      name={card.label}
                      stroke={CHART_COLORS[index % CHART_COLORS.length]}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={addCardOpen}
        onOpenChange={(open) => {
          setAddCardOpen(open);
          if (!open) {
            form.reset({ label: "", brand: "", closing_day: 5, due_day: 10, limit_amount: "" });
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar cartão</DialogTitle>
            <DialogDescription>Cadastre um novo cartão para acompanhar as faturas nesta aba.</DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form className="space-y-4" onSubmit={form.handleSubmit(onSubmitNewCard)}>
              <FormField
                control={form.control}
                name="label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Apelido</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Nubank" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="brand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bandeira</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a bandeira" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {brandOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="closing_day"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dia de fechamento</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} max={31} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="due_day"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dia de vencimento</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} max={31} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="limit_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Limite (opcional)</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} step="0.01" placeholder="R$" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={createCard.isPending || !user}>
                {createCard.isPending && <CustomLoader className="mr-2 h-4 w-4" />}
                Salvar cartão
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedCard} onOpenChange={(open) => !open && setSelectedCard(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
            <DialogTitle>Fatura - {selectedCard?.label}</DialogTitle>
            <DialogDescription>
              Competência {format(currentDate, "MMMM/yyyy")}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-4">
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Total da Fatura</p>
              <p className="text-2xl font-bold text-primary">R$ {formatCurrency(selectedCardTotal)}</p>
            </div>

            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
              <p className="mb-2 text-xs font-extrabold uppercase tracking-wider text-primary">Gastos da fatura</p>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="flex items-center justify-between rounded-md border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-2">
                  <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">Individuais</span>
                  <div className="text-right">
                    <p className="text-sm font-extrabold text-foreground">R$ {formatCurrency(selectedCardIndividualTotal)}</p>
                    <p className="text-[10px] font-semibold text-emerald-800/80 dark:text-emerald-200">{selectedCardIndividualPercentage.toFixed(1)}% da fatura</p>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-md border border-blue-500/40 bg-blue-500/15 px-2.5 py-2">
                  <span className="text-xs font-bold text-blue-800 dark:text-blue-300">Coletivos</span>
                  <div className="text-right">
                    <p className="text-sm font-extrabold text-foreground">R$ {formatCurrency(selectedCardCollectiveTotal)}</p>
                    <p className="text-[10px] font-semibold text-blue-800/80 dark:text-blue-200">{selectedCardCollectivePercentage.toFixed(1)}% da fatura</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="border rounded-lg divide-y bg-card">
              {sortedSelectedCardInstallments.map((item: any, index: number) => {
                const isAVista = (item.expenses?.installments || 1) <= 1;
                return (
                  <div key={`${item.id}-${index}`} className="flex items-center justify-between p-3">
                    <div className="min-w-0 pr-3">
                      <p className="text-sm font-medium truncate">{item.expenses?.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {getCategoryLabel(item.expenses?.category)} • {isAVista ? "À vista" : `Parcela ${item.installment_number}/${item.expenses?.installments}`}
                      </p>
                      <p className="text-xs text-muted-foreground/80">
                        Compra {item.expenses?.purchase_date ? format(parseLocalDate(item.expenses.purchase_date), "dd/MM/yyyy") : "n/d"}
                      </p>
                    </div>
                    <p className="text-sm font-bold">R$ {formatCurrency(Number(item.amount))}</p>
                  </div>
                );
              })}

              {sortedSelectedCardInstallments.length === 0 && (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  Nenhum lançamento encontrado para este cartão nesta competência.
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Card Dialog */}
      <Dialog
        open={editCardOpen}
        onOpenChange={(open) => {
          setEditCardOpen(open);
          if (!open) {
            form.reset({ label: "", brand: "", closing_day: 5, due_day: 10, limit_amount: "" });
            setSelectedCard(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar cartão</DialogTitle>
            <DialogDescription>Atualize os dados do cartão.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form className="space-y-4" onSubmit={form.handleSubmit((v) => updateCard.mutate(v))}>
              <FormField control={form.control} name="label" render={({ field }) => (<FormItem><FormLabel>Apelido</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="brand" render={({ field }) => (<FormItem><FormLabel>Bandeira</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{brandOptions.map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField control={form.control} name="closing_day" render={({ field }) => (<FormItem><FormLabel>Dia de fechamento</FormLabel><FormControl><Input type="number" min={1} max={31} {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="due_day" render={({ field }) => (<FormItem><FormLabel>Dia de vencimento</FormLabel><FormControl><Input type="number" min={1} max={31} {...field} /></FormControl><FormMessage /></FormItem>)} />
              </div>
              <FormField control={form.control} name="limit_amount" render={({ field }) => (<FormItem><FormLabel>Limite (opcional)</FormLabel><FormControl><Input type="number" min={0} step="0.01" placeholder="R$" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <Button type="submit" className="w-full" disabled={updateCard.isPending}>{updateCard.isPending && <CustomLoader className="mr-2 h-4 w-4" />}Salvar alterações</Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Card Alert */}
      <AlertDialog open={!!deletingCard} onOpenChange={(open) => !open && setDeletingCard(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cartão</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir o cartão "{deletingCard?.label}"? Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deletingCard && deleteCard.mutate(deletingCard.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}