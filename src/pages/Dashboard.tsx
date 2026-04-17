"use client";

import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, CreditCard, Home, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";

import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { HomeTab } from "@/components/dashboard/HomeTab";
import { PersonalTab } from "@/components/dashboard/PersonalTab";
import { CardsTab } from "@/components/dashboard/CardsTab";
import { PaymentDialogs, type RateioScope } from "@/components/dashboard/PaymentDialogs";
import { getCategoryLabel } from "@/constants/categories";
import { useCycleDates } from "@/hooks/useCycleDates";

export default function Dashboard() {
  const { profile, membership, user } = useAuth();
  const queryClient = useQueryClient();
  
  // Payment State
  const [payRateioOpen, setPayRateioOpen] = useState(false);
  const [payIndividualOpen, setPayIndividualOpen] = useState(false);
  const [selectedIndividualSplit, setSelectedIndividualSplit] = useState<any>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [rateioScope, setRateioScope] = useState<RateioScope>("previous");
  const [rateioCurrentAmount, setRateioCurrentAmount] = useState("");
  const [activeTab, setActiveTab] = useState("home");
  const [heroCompact, setHeroCompact] = useState(false);

  const {
    currentDate,
    cycleStart,
    cycleEnd,
    cycleLimitDate,
    nextMonth,
    prevMonth,
    closingDay,
  } = useCycleDates(membership?.group_id);

  // --- Queries ---

  const { data: expensesInCycle = [] } = useQuery({
    queryKey: ["expenses-dashboard", membership?.group_id, currentDate.getFullYear(), currentDate.getMonth() + 1],
    queryFn: async () => {
      const competenceKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}`;

      const { data, error } = await supabase
        .from("expenses")
        .select(`
          *,
          expense_splits (
            user_id,
            amount
          )
        `)
        .eq("group_id", membership!.group_id)
        .eq("competence_key", competenceKey);
      
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!membership?.group_id
  });

  const { data: pendingSplits = [] } = useQuery({
    queryKey: ["my-pending-splits-dashboard", membership?.group_id, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expense_splits")
        .select("id, amount, status, expense_id, expenses:expense_id(title, category, group_id, expense_type, created_at, purchase_date, competence_key, payment_method, credit_card_id, installments, credit_cards:credit_card_id(closing_day)), payments(id, status)")
        .eq("user_id", user!.id)
        .eq("status", "pending");
      if (error) throw error;
      return (data ?? []).filter((s: any) => s.expenses?.group_id === membership!.group_id);
    },
    enabled: !!membership?.group_id && !!user?.id,
  });

  // Bulk payments query - only needed for rateio bulk payment deduction
  const { data: myBulkPayments = [] } = useQuery({
    queryKey: ["my-bulk-payments-dashboard", membership?.group_id, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("id, amount, notes, status")
        .eq("group_id", membership!.group_id)
        .eq("paid_by", user!.id)
        .is("expense_split_id", null)
        .in("status", ["pending", "confirmed"]);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!membership?.group_id && !!user?.id,
  });

  const { data: creditCards = [], isLoading: isLoadingCreditCards } = useQuery({
    queryKey: ["my-credit-cards", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("credit_cards").select("*").eq("user_id", user!.id);
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: billInstallments = [], isLoading: isLoadingBillInstallments } = useQuery({
    queryKey: ["bill-installments-dashboard", user?.id, currentDate.getMonth(), currentDate.getFullYear()],
    queryFn: async () => {
      const targetMonth = currentDate.getMonth() + 1; 
      const targetYear = currentDate.getFullYear();

      const [groupRes, personalRes] = await Promise.all([
        supabase
          .from("expense_installments" as any)
          .select("id, amount, installment_number, expenses(title, category, credit_card_id, expense_type, purchase_date, installments)")
          .eq("user_id", user!.id)
          .eq("bill_month", targetMonth)
          .eq("bill_year", targetYear)
          .limit(1000),
        supabase
          .from("personal_expense_installments")
          .select("id, amount, installment_number, personal_expenses(title, credit_card_id, purchase_date, installments)")
          .eq("user_id", user!.id)
          .eq("bill_month", targetMonth)
          .eq("bill_year", targetYear)
          .limit(1000),
      ]);

      const groupItems = (groupRes.data as any[] ?? []);
      const personalItems = (personalRes.data as any[] ?? []).map((p: any) => ({
        ...p,
        expenses: {
          title: p.personal_expenses?.title,
          category: "other",
          credit_card_id: p.personal_expenses?.credit_card_id,
          expense_type: "personal",
          purchase_date: p.personal_expenses?.purchase_date,
          installments: p.personal_expenses?.installments ?? 1,
        },
      }));

      return [...groupItems, ...personalItems];
    },
    enabled: !!user,
  });

  // --- Data Processing ---

  const collectiveExpenses = expensesInCycle.filter(e => e.expense_type === "collective");
  const totalMonthExpenses = collectiveExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  
  const myCollectiveShare = collectiveExpenses.reduce((sum, e) => {
    const splits = (e.expense_splits as unknown as { user_id: string; amount: number }[]) || [];
    const mySplit = splits.find((s) => s.user_id === user?.id);
    return sum + (mySplit ? Number(mySplit.amount) : 0);
  }, 0);

  const republicChartData = useMemo(() => {
    const categories: Record<string, number> = {};
    collectiveExpenses.forEach(e => {
      const label = getCategoryLabel(e.category);
      categories[label] = (categories[label] || 0) + Number(e.amount);
    });
    return Object.entries(categories)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [collectiveExpenses]);

  // Gastos à vista do ciclo atual
  const currentCycleCashIndividualExpenses = expensesInCycle.filter(
    (e) => e.created_by === user?.id && e.expense_type === "individual" && e.payment_method !== "credit_card"
  );

  // Parcelas de despesas individuais (sejam vinculadas ao grupo ou inteiramente pessoais) deste mês
  const currentMonthIndividualInstallments = billInstallments
    .filter((i: any) => i.expenses?.expense_type === "individual" || i.expenses?.expense_type === "personal")
    .map((i: any) => ({
      id: i.id, // Usa o ID da parcela para evitar colisão no React key
      title: i.expenses?.title,
      category: i.expenses?.category,
      amount: i.amount,
      purchase_date: i.expenses?.purchase_date,
      payment_method: "credit_card",
      expense_type: i.expenses?.expense_type,
      created_by: user?.id,
      installment_number: i.installment_number,
      installments: i.expenses?.installments || 1,
    }));

  const myPersonalExpenses = [
    ...currentCycleCashIndividualExpenses,
    ...currentMonthIndividualInstallments,
  ];
  
  const totalPersonalCash = myPersonalExpenses
    .filter(e => e.payment_method !== "credit_card")
    .reduce((sum, e) => sum + Number(e.amount), 0);

  const totalBill = billInstallments.reduce((sum: number, i: any) => sum + Number(i.amount), 0);

  const personalChartData = useMemo(() => {
    const categories: Record<string, number> = {};
    myPersonalExpenses.forEach(e => {
      const label = getCategoryLabel(e.category);
      categories[label] = (categories[label] || 0) + Number(e.amount);
    });
    return Object.entries(categories)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [myPersonalExpenses]);

  // Filtering Logic for Pending Splits (Debts)
  
  // 1. Collective Debt (Rateio Pendente)
  const currentCompetenceKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}`;

  const collectivePending = pendingSplits
    .filter((s: any) => {
      if (s.expenses?.expense_type !== "collective") return false;
      // Exclude splits that have any pending or confirmed payment linked
      const hasPayment = (s.payments || []).some((p: any) => p.status === 'pending' || p.status === 'confirmed');
      return !hasPayment;
    })
    .map((split: any) => ({
      ...split,
      competenceKey: split.expenses?.competence_key ?? null,
    }));

  // Deduct bulk payments (rateio payments without expense_split_id)
  // These are lump-sum payments that don't link to specific splits
  const totalBulkPayments = useMemo(() => {
    return myBulkPayments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
  }, [myBulkPayments]);

  const collectivePendingCurrent = collectivePending
    .filter((s: any) => s.competenceKey === currentCompetenceKey)
    .sort((a: any, b: any) => (b.expenses?.purchase_date || "").localeCompare(a.expenses?.purchase_date || ""));
    
  const collectivePendingPrevious = collectivePending.filter((s: any) => !s.competenceKey || s.competenceKey < currentCompetenceKey);
  const rawTotalCollectivePendingPrevious = collectivePendingPrevious.reduce((sum: number, s: any) => sum + Number(s.amount), 0);
  const rawTotalCollectivePendingCurrent = collectivePendingCurrent.reduce((sum: number, s: any) => sum + Number(s.amount), 0);
  
  // Apply bulk payments: first against previous, remainder against current
  const bulkAppliedToPrevious = Math.min(totalBulkPayments, rawTotalCollectivePendingPrevious);
  const bulkRemainder = totalBulkPayments - bulkAppliedToPrevious;
  const totalCollectivePendingPrevious = Math.max(0, rawTotalCollectivePendingPrevious - bulkAppliedToPrevious);
  const totalCollectivePendingCurrent = Math.max(0, rawTotalCollectivePendingCurrent - bulkRemainder);
  
  // Função para abater os pagamentos em lote (bulk) dos itens mais antigos para os mais recentes
  const applyBulkToItems = (items: any[], amountToApply: number) => {
    if (amountToApply <= 0.01) return items;
    
    // Sort from oldest to newest to pay off oldest first
    const sortedItems = [...items].sort((a, b) => {
      const dateA = a.expenses?.purchase_date || "9999-12-31";
      const dateB = b.expenses?.purchase_date || "9999-12-31";
      return dateA.localeCompare(dateB);
    });

    let remainingBulkCents = Math.round(amountToApply * 100);
    const result = [];

    for (const item of sortedItems) {
      const itemAmountCents = Math.round(Number(item.amount) * 100);
      if (remainingBulkCents >= itemAmountCents) {
        // Fully paid
        remainingBulkCents -= itemAmountCents;
      } else if (remainingBulkCents > 0) {
        // Partially paid
        result.push({
          ...item,
          amount: (itemAmountCents - remainingBulkCents) / 100,
          originalAmount: itemAmountCents / 100
        });
        remainingBulkCents = 0;
      } else {
        // Not paid
        result.push(item);
      }
    }

    // Return to original sort (usually newest first in UI)
    return result.sort((a, b) => {
      const dateA = a.expenses?.purchase_date || "";
      const dateB = b.expenses?.purchase_date || "";
      return dateB.localeCompare(dateA);
    });
  };

  const displayCollectivePendingPrevious = totalCollectivePendingPrevious > 0.01
    ? applyBulkToItems(collectivePendingPrevious, bulkAppliedToPrevious)
    : [];
    
  const displayCollectivePendingCurrent = totalCollectivePendingCurrent > 0.01
    ? applyBulkToItems(collectivePendingCurrent, bulkRemainder)
    : [];

  const collectivePendingPreviousByCompetence = useMemo(() => {
    if (totalCollectivePendingPrevious <= 0.01) return [];

    const grouped = displayCollectivePendingPrevious.reduce((acc: Record<string, any[]>, item: any) => {
      const competence = item.expenses?.competence_key ?? "Sem competência";
      if (!acc[competence]) acc[competence] = [];
      acc[competence].push(item);
      return acc;
    }, {} as Record<string, any[]>);

    return Object.entries(grouped)
      .map(([competence, items]: [string, any[]]) => ({
        competence,
        items: items.sort((a: any, b: any) => (b.expenses?.purchase_date || "").localeCompare(a.expenses?.purchase_date || "")),
        total: items.reduce((sum: number, split: any) => sum + Number(split.amount), 0),
      }))
      .sort((a, b) => {
        const [yearA, monthA] = a.competence.split("-").map(Number);
        const [yearB, monthB] = b.competence.split("-").map(Number);

        if (!monthA || !yearA) return 1;
        if (!monthB || !yearB) return -1;

        const dateA = new Date(yearA, monthA - 1, 1).getTime();
        const dateB = new Date(yearB, monthB - 1, 1).getTime();
        return dateB - dateA;
      });
  }, [displayCollectivePendingPrevious, totalCollectivePendingPrevious]);

  // 2. Individual Pending (Manual + Installments)
  const manualIndividualPending = pendingSplits.filter((s: any) => {
    const isIndividual = s.expenses?.expense_type === "individual";
    const isNotCreditCard = s.expenses?.payment_method !== "credit_card";
    const hasNoPayment = !(s.payments || []).some((p: any) => p.status === 'pending' || p.status === 'confirmed');
    const isInCycle = s.expenses?.competence_key === currentCompetenceKey;

    return isIndividual && isNotCreditCard && hasNoPayment && isInCycle;
  });

  const installmentIndividualPending = billInstallments.filter((i: any) => 
    i.expenses?.expense_type === "individual" || i.expenses?.expense_type === "personal"
  ).map((i: any) => ({
    id: i.id, // Installment ID
    amount: i.amount,
    installment_number: i.installment_number,
    expenses: i.expenses // { title, category, purchase_date, installments }
  }));

  const individualPending = [...manualIndividualPending, ...installmentIndividualPending]
    .sort((a: any, b: any) => (b.expenses?.purchase_date || "").localeCompare(a.expenses?.purchase_date || ""));
    
  const totalIndividualPending = individualPending.reduce((sum: number, item: any) => sum + Number(item.amount), 0);

  const totalUserExpenses = myCollectiveShare + totalIndividualPending;

  const cardsBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    creditCards.forEach(c => map[c.id] = 0);
    billInstallments.forEach((i: any) => {
      const cId = i.expenses?.credit_card_id;
      if (cId && map[cId] !== undefined) {
        map[cId] += Number(i.amount);
      }
    });
    return map;
  }, [creditCards, billInstallments]);

  const cardsChartData = useMemo(() => {
    const categories: Record<string, number> = {};
    billInstallments.forEach((i: any) => {
      const rawCat = i.expenses?.category || "other";
      const label = getCategoryLabel(rawCat);
      categories[label] = (categories[label] || 0) + Number(i.amount);
    });
    return Object.entries(categories)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [billInstallments]);

  const handlePayRateio = async (scope: RateioScope) => {
    if (!receiptFile) return;
    setSaving(true);
    try {
      const parsedCurrentAmount = Number(rateioCurrentAmount.replace(",", "."));
      const amount = scope === "previous" ? totalCollectivePendingPrevious : parsedCurrentAmount;

      if (!Number.isFinite(amount) || amount <= 0) {
        toast({ title: "Valor inválido", description: "Informe um valor maior que zero.", variant: "destructive" });
        return;
      }

      const ext = receiptFile.name.split(".").pop();
      const path = `${user!.id}/${Date.now()}_rateio.${ext}`;
      await supabase.storage.from("receipts").upload(path, receiptFile);
      const { data: urlData } = supabase.storage.from("receipts").getPublicUrl(path);
      const competenceYear = currentDate.getFullYear();
      const competenceMonth = currentDate.getMonth() + 1;
      const competenceKey = `${competenceYear}-${String(competenceMonth).padStart(2, "0")}`;

      await supabase.from("payments").insert({
        group_id: membership!.group_id,
        expense_split_id: null,
        paid_by: user!.id,
        competence_key: getCompetenceKeyFromDate(new Date(), closingDay),
        amount,
        receipt_url: urlData.publicUrl,
        competence_year: competenceYear,
        competence_month: competenceMonth,
        competence_key: competenceKey,
        notes: scope === "previous"
          ? `Pagamento de Rateio - competências anteriores (${format(currentDate, "MMMM/yyyy", { locale: ptBR })})`
          : `Pagamento de Rateio - competência atual (${format(currentDate, "MMMM/yyyy", { locale: ptBR })})`
      });

      toast({ title: "Pagamento enviado!" });
      queryClient.invalidateQueries({ queryKey: ["my-pending-splits-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["my-bulk-payments-dashboard"] });
      setPayRateioOpen(false);
      setReceiptFile(null);
      setRateioCurrentAmount("");
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handlePayIndividual = async () => {
    if (!receiptFile || !selectedIndividualSplit) return;
    setSaving(true);
    try {
      const ext = receiptFile.name.split(".").pop();
      const path = `${user!.id}/${Date.now()}_indiv.${ext}`;
      await supabase.storage.from("receipts").upload(path, receiptFile);
      const { data: urlData } = supabase.storage.from("receipts").getPublicUrl(path);
      const competenceYear = currentDate.getFullYear();
      const competenceMonth = currentDate.getMonth() + 1;
      const competenceKey = `${competenceYear}-${String(competenceMonth).padStart(2, "0")}`;

      await supabase.from("payments").insert({
        group_id: membership!.group_id,
        expense_split_id: selectedIndividualSplit.id,
        paid_by: user!.id,
        competence_key: getCompetenceKeyFromDate(new Date(), closingDay),
        amount: Number(selectedIndividualSplit.amount),
        receipt_url: urlData.publicUrl,
        competence_year: competenceYear,
        competence_month: competenceMonth,
        competence_key: competenceKey,
        notes: `Pagamento individual: ${selectedIndividualSplit.expenses?.title}`
      });

      toast({ title: "Pagamento individual enviado!" });
      queryClient.invalidateQueries({ queryKey: ["my-pending-splits-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["my-bulk-payments-dashboard"] });
      setPayIndividualOpen(false);
      setSelectedIndividualSplit(null);
      setReceiptFile(null);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const tabTriggerClass = "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm text-foreground/60 text-xs font-semibold px-3 py-1.5 rounded-md transition-all";
  const tabListClass = "w-full justify-start overflow-x-auto bg-muted/50 rounded-lg p-1 h-auto gap-1";

  const compactTabsList = (
    <TabsList className={tabListClass}>
      <TabsTrigger value="home" className={tabTriggerClass}>
        <Home className="h-3.5 w-3.5 mr-1.5" /> Início
      </TabsTrigger>
      <TabsTrigger value="personal" className={tabTriggerClass}>
        <User className="h-3.5 w-3.5 mr-1.5" /> Geral
      </TabsTrigger>
      <TabsTrigger value="cards" className={tabTriggerClass}>
        <CreditCard className="h-3.5 w-3.5 mr-1.5" /> Cartões
      </TabsTrigger>
    </TabsList>
  );

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 animate-in fade-in duration-500">
      <DashboardHeader
        userName={profile?.full_name}
        groupName={membership?.group_name}
        currentDate={currentDate}
        cycleStart={cycleStart}
        cycleEnd={cycleEnd}
        cycleLimitDate={cycleLimitDate}
        onNextMonth={nextMonth}
        onPrevMonth={prevMonth}
        compactTabs={compactTabsList}
        onCompactChange={setHeroCompact}
      />

      <div className="space-y-4">
        {!heroCompact && (
          <TabsList className={tabListClass}>
            <TabsTrigger value="home" className={tabTriggerClass}>
              <Home className="h-3.5 w-3.5 mr-1.5" /> Início
            </TabsTrigger>
            <TabsTrigger value="personal" className={tabTriggerClass}>
              <User className="h-3.5 w-3.5 mr-1.5" /> Geral
            </TabsTrigger>
            <TabsTrigger value="cards" className={tabTriggerClass}>
              <CreditCard className="h-3.5 w-3.5 mr-1.5" /> Cartões
            </TabsTrigger>
          </TabsList>
        )}

        <TabsContent value="home" className="space-y-6">
          <HomeTab closingDay={closingDay} />
        </TabsContent>

        <TabsContent value="personal" className="space-y-6">
          <PersonalTab
            totalIndividualPending={totalIndividualPending}
            totalCollectivePendingPrevious={totalCollectivePendingPrevious}
            totalCollectivePendingCurrent={totalCollectivePendingCurrent}
            collectivePendingPreviousByCompetence={collectivePendingPreviousByCompetence}
            collectivePendingCurrent={displayCollectivePendingCurrent}
            individualPending={individualPending}
            totalPersonalCash={totalPersonalCash}
            totalBill={totalBill}
            totalUserExpenses={totalUserExpenses}
            myCollectiveShare={myCollectiveShare}
            personalChartData={personalChartData}
            myPersonalExpenses={myPersonalExpenses}
            collectiveExpenses={collectiveExpenses}
            republicChartData={republicChartData}
            totalMonthExpenses={totalMonthExpenses}
            onPayRateio={(scope) => {
              setRateioScope(scope);
              if (scope === "current") {
                setRateioCurrentAmount(totalCollectivePendingCurrent.toFixed(2));
              } else {
                setRateioCurrentAmount("");
              }
              setPayRateioOpen(true);
            }}
          />
        </TabsContent>

        <TabsContent value="cards" className="space-y-6">
          <CardsTab 
            totalBill={totalBill}
            currentDate={currentDate}
            cardsChartData={cardsChartData}
            creditCards={creditCards}
            cardsBreakdown={cardsBreakdown}
            billInstallments={billInstallments}
            isLoading={isLoadingCreditCards || isLoadingBillInstallments}
          />
        </TabsContent>
      </div>

      <PaymentDialogs
        payRateioOpen={payRateioOpen}
        setPayRateioOpen={setPayRateioOpen}
        payIndividualOpen={payIndividualOpen}
        setPayIndividualOpen={setPayIndividualOpen}
        selectedIndividualSplit={selectedIndividualSplit}
        setSelectedIndividualSplit={setSelectedIndividualSplit}
        collectivePendingByScope={{
          previous: { total: totalCollectivePendingPrevious, items: displayCollectivePendingPrevious },
          current: { total: totalCollectivePendingCurrent, items: displayCollectivePendingCurrent },
        }}
        rateioScope={rateioScope}
        individualPending={individualPending}
        currentDate={currentDate}
        onPayRateio={handlePayRateio}
        onPayIndividual={handlePayIndividual}
        saving={saving}
        receiptFile={receiptFile}
        setReceiptFile={setReceiptFile}
        rateioCurrentAmount={rateioCurrentAmount}
        setRateioCurrentAmount={setRateioCurrentAmount}
      />
    </Tabs>
  );
}
