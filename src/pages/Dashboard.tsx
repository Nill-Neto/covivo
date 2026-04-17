"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, CreditCard, Home, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";
import { parseLocalDate } from "@/lib/utils";

import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { HomeTab } from "@/components/dashboard/HomeTab";
import { PersonalTab } from "@/components/dashboard/PersonalTab";
import { CardsTab } from "@/components/dashboard/CardsTab";
import { PaymentDialogs, type RateioScope } from "@/components/dashboard/PaymentDialogs";
import { getCategoryLabel } from "@/constants/categories";
import { useCycleDates } from "@/hooks/useCycleDates";
import { getCompetenceKeyFromDate, formatCompetenceKey } from "@/lib/cycleDates";

export default function Dashboard() {
  const { profile, membership, user } = useAuth();
  const queryClient = useQueryClient();
  
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

  const currentCompetenceKey = formatCompetenceKey(currentDate);

  const { data: expensesInCycle = [] } = useQuery({
    queryKey: ["expenses-dashboard", membership?.group_id, currentCompetenceKey],
    queryFn: async () => {
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
        .eq("competence_key", currentCompetenceKey);
      
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
        .select("id, amount, status, expense_id, expenses:expense_id(title, category, group_id, expense_type, created_at, purchase_date, payment_method, credit_card_id, installments, competence_key, credit_cards:credit_card_id(closing_day)), payments(id, status)")
        .eq("user_id", user!.id)
        .eq("status", "pending");
      if (error) throw error;
      return (data ?? []).filter((s: any) => s.expenses?.group_id === membership!.group_id);
    },
    enabled: !!membership?.group_id && !!user?.id,
  });

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
    queryKey: ["bill-installments-dashboard", user?.id, membership?.group_id, currentDate.getMonth(), currentDate.getFullYear()],
    queryFn: async () => {
      const targetMonth = currentDate.getMonth() + 1;
      const targetYear = currentDate.getFullYear();

      const [groupRes, personalRes] = await Promise.all([
        supabase
          .from("expense_installments" as any)
          .select("id, amount, installment_number, expenses!inner(title, category, credit_card_id, expense_type, purchase_date, installments, group_id)")
          .eq("user_id", user!.id)
          .eq("expenses.group_id", membership!.group_id)
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

      if (groupRes.error) console.error("[Dashboard] group installments error:", groupRes.error);
      if (personalRes.error) console.error("[Dashboard] personal installments error:", personalRes.error);

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
    enabled: !!user && !!membership?.group_id,
  });

  // Debugging logs
  useEffect(() => {
    if (membership?.group_id) {
      console.log("[Dashboard] Active Group:", membership.group_name, membership.group_id);
      console.log("[Dashboard] Competence Key:", currentCompetenceKey);
      console.log("[Dashboard] Expenses in cycle count:", expensesInCycle.length);
      console.log("[Dashboard] Collective expenses count:", collectiveExpenses.length);
    }
  }, [membership, currentCompetenceKey, expensesInCycle.length, collectiveExpenses.length]);

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

  const currentCycleCashIndividualExpenses = expensesInCycle.filter(
    (e) => e.created_by === user?.id && e.expense_type === "individual" && e.payment_method !== "credit_card"
  );

  const currentMonthIndividualInstallments = billInstallments
    .filter((i: any) => i.expenses?.expense_type === "individual" || i.expenses?.expense_type === "personal")
    .map((i: any) => ({
      id: i.id,
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

  const collectivePending = pendingSplits
    .filter((s: any) => {
      if (s.expenses?.expense_type !== "collective") return false;
      const hasPayment = (s.payments || []).some((p: any) => p.status === 'pending' || p.status === 'confirmed');
      return !hasPayment;
    })
    .map((split: any) => {
      let compKey = split.expenses?.competence_key;
      if (!compKey && split.expenses?.purchase_date) {
        compKey = getCompetenceKeyFromDate(new Date(`${split.expenses.purchase_date}T12:00:00`), closingDay);
      }
      return {
        ...split,
        competenceKey: compKey,
      };
    });

  const totalBulkPayments = useMemo(() => {
    return myBulkPayments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
  }, [myBulkPayments]);

  const collectivePendingCurrent = collectivePending
    .filter((s: any) => s.competenceKey === currentCompetenceKey)
    .sort((a: any, b: any) => (b.expenses?.purchase_date || "").localeCompare(a.expenses?.purchase_date || ""));
    
  const collectivePendingPrevious = collectivePending.filter((s: any) => !s.competenceKey || s.competenceKey < currentCompetenceKey);
  const rawTotalCollectivePendingPrevious = collectivePendingPrevious.reduce((sum: number, s: any) => sum + Number(s.amount), 0);
  const rawTotalCollectivePendingCurrent = collectivePendingCurrent.reduce((sum: number, s: any) => sum + Number(s.amount), 0);
  
  const bulkAppliedToPrevious = Math.min(totalBulkPayments, rawTotalCollectivePendingPrevious);
  const bulkRemainder = totalBulkPayments - bulkAppliedToPrevious;
  const totalCollectivePendingPrevious = Math.max(0, rawTotalCollectivePendingPrevious - bulkAppliedToPrevious);
  const totalCollectivePendingCurrent = Math.max(0, rawTotalCollectivePendingCurrent - bulkRemainder);
  
  const applyBulkToItems = (items: any[], amountToApply: number) => {
    if (amountToApply <= 0.01) return items;
    
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
        remainingBulkCents -= itemAmountCents;
      } else if (remainingBulkCents > 0) {
        result.push({
          ...item,
          amount: (itemAmountCents - remainingBulkCents) / 100,
          originalAmount: itemAmountCents / 100
        });
        remainingBulkCents = 0;
      } else {
        result.push(item);
      }
    }

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
      const purchaseDate = item.expenses?.purchase_date ? parseLocalDate(item.expenses.purchase_date) : null;
      const competence = purchaseDate ? format(purchaseDate, "MM/yyyy") : "Sem competência";
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
        const [monthA, yearA] = a.competence.split("/").map(Number);
        const [monthB, yearB] = b.competence.split("/").map(Number);
        if (!monthA || !yearA) return 1;
        if (!monthB || !yearB) return -1;
        return new Date(yearB, monthB - 1, 1).getTime() - new Date(yearA, monthA - 1, 1).getTime();
      });
  }, [displayCollectivePendingPrevious, totalCollectivePendingPrevious]);

  const manualIndividualPending = pendingSplits.filter((s: any) => {
    const isIndividual = s.expenses?.expense_type === "individual";
    const isNotCreditCard = s.expenses?.payment_method !== "credit_card";
    const hasNoPayment = !(s.payments || []).some((p: any) => p.status === 'pending' || p.status === 'confirmed');
    
    let compKey = s.expenses?.competence_key;
    if (!compKey && s.expenses?.purchase_date) {
      compKey = getCompetenceKeyFromDate(new Date(`${s.expenses.purchase_date}T12:00:00`), closingDay);
    }
    const isInCycle = compKey === currentCompetenceKey;

    return isIndividual && isNotCreditCard && hasNoPayment && isInCycle;
  });

  const installmentIndividualPending = billInstallments.filter((i: any) => 
    i.expenses?.expense_type === "individual" || i.expenses?.expense_type === "personal"
  ).map((i: any) => ({
    id: i.id,
    amount: i.amount,
    installment_number: i.installment_number,
    expenses: i.expenses
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
      const amount = parsedCurrentAmount;

      if (!Number.isFinite(amount) || amount <= 0) {
        toast({ title: "Valor inválido", description: "Informe um valor maior que zero.", variant: "destructive" });
        return;
      }
      
      if (scope === "previous" && amount > totalCollectivePendingPrevious + 0.01) {
        toast({ title: "Valor inválido", description: `O valor não pode ser maior que o total pendente (R$ ${totalCollectivePendingPrevious.toFixed(2)}).`, variant: "destructive" });
        return;
      }

      const ext = receiptFile.name.split(".").pop();
      const path = `${user!.id}/${Date.now()}_rateio.${ext}`;
      await supabase.storage.from("receipts").upload(path, receiptFile);
      const { data: urlData } = supabase.storage.from("receipts").getPublicUrl(path);

      let paymentDate = new Date();
      if (scope === "previous") {
        paymentDate = new Date(cycleStart.getTime() - 12 * 60 * 60 * 1000);
      }

      const compKey = getCompetenceKeyFromDate(paymentDate, closingDay);
      const [y, m] = compKey.split("-").map(Number);

      await (supabase.from("payments") as any).insert({
        group_id: membership!.group_id,
        expense_split_id: null,
        paid_by: user!.id,
        competence_key: currentCompetenceKey,
        amount,
        receipt_url: urlData.publicUrl,
        created_at: paymentDate.toISOString(),
        competence_year: y,
        competence_month: m,
        notes: scope === "previous"
          ? `Pagamento de Rateio - competências anteriores`
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

      const paymentDate = new Date();
      const compKey = getCompetenceKeyFromDate(paymentDate, closingDay);
      const [y, m] = compKey.split("-").map(Number);

      await (supabase.from("payments") as any).insert({
        group_id: membership!.group_id,
        expense_split_id: selectedIndividualSplit.id,
        paid_by: user!.id,
        competence_key: currentCompetenceKey,
        amount: Number(selectedIndividualSplit.amount),
        receipt_url: urlData.publicUrl,
        created_at: paymentDate.toISOString(),
        competence_year: y,
        competence_month: m,
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
                setRateioCurrentAmount(totalCollectivePendingPrevious.toFixed(2));
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