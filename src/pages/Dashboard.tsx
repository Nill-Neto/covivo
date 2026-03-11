import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { RepublicTab } from "@/components/dashboard/RepublicTab";
import { PersonalTab } from "@/components/dashboard/PersonalTab";
import { CardsTab } from "@/components/dashboard/CardsTab";
import { PaymentDialogs, RateioScope } from "@/components/dashboard/PaymentDialogs";
import { format, addMonths, subMonths, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Home, Wallet, CreditCard as CreditCardIcon, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { getCategoryLabel } from "@/constants/categories";

const tabTriggerClass = "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm text-foreground/60 text-xs font-semibold px-3 py-1.5 rounded-md transition-all";
const tabListClass = "w-full justify-start overflow-x-auto bg-muted/50 rounded-lg p-1 h-auto gap-1";

export default function Dashboard() {
  const { user, profile, membership } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("republic");
  const [heroCompact, setHeroCompact] = useState(false);

  // Payment states
  const [payRateioOpen, setPayRateioOpen] = useState(false);
  const [payIndividualOpen, setPayIndividualOpen] = useState(false);
  const [selectedIndividualSplit, setSelectedIndividualSplit] = useState<any>(null);
  const [rateioScope, setRateioScope] = useState<RateioScope>("current");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  // Date Cycle Logic
  const { data: groupSettings } = useQuery({
    queryKey: ["group-settings-dashboard", membership?.group_id],
    queryFn: async () => {
      const { data } = await supabase.from("groups").select("closing_day, due_day").eq("id", membership!.group_id).single();
      return data;
    },
    enabled: !!membership?.group_id
  });

  const closingDay = groupSettings?.closing_day || 1;
  const dueDay = groupSettings?.due_day || 10;
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());

  useEffect(() => {
    if (groupSettings) {
      const today = new Date();
      if (today.getDate() >= closingDay) {
        setCurrentDate(addMonths(today, 1));
      } else {
        setCurrentDate(today);
      }
    }
  }, [groupSettings, closingDay]);

  const cycleStart = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, closingDay);
  const cycleEnd = new Date(currentDate.getFullYear(), currentDate.getMonth(), closingDay);
  cycleStart.setHours(0, 0, 0, 0);
  cycleEnd.setHours(0, 0, 0, 0);
  
  const cycleDueDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), dueDay);
  const cycleLimitDate = subDays(cycleDueDate, 1);
  const isLate = new Date() > cycleLimitDate && new Date().toDateString() !== cycleLimitDate.toDateString();

  const { data: dbData, isLoading } = useQuery({
    queryKey: ["dashboard-data", membership?.group_id, user?.id, cycleStart.toISOString(), cycleEnd.toISOString()],
    queryFn: async () => {
      if (!membership || !user) return null;

      const dbStart = format(cycleStart, "yyyy-MM-dd");
      const dbEnd = format(cycleEnd, "yyyy-MM-dd");

      const [cardsRes, expensesRes, pendingSplitsRes, installmentsRes] = await Promise.all([
        supabase.from("credit_cards").select("*").eq("user_id", user.id),
        supabase.from("expenses").select("*, expense_splits(user_id, amount)").eq("group_id", membership.group_id).gte("purchase_date", dbStart).lt("purchase_date", dbEnd),
        supabase.from("expense_splits").select("id, amount, expense_id, status, expenses!inner(*)").eq("user_id", user.id).eq("status", "pending"),
        supabase.from("expense_installments").select("*, expenses!inner(*)").eq("user_id", user.id).eq("bill_month", currentDate.getMonth() + 1).eq("bill_year", currentDate.getFullYear()),
      ]);

      return {
        cards: cardsRes.data || [],
        expenses: expensesRes.data || [],
        pendingSplits: pendingSplitsRes.data || [],
        installments: installmentsRes.data || [],
      };
    },
    enabled: !!membership?.group_id && !!user?.id,
  });

  const submitPayment = useMutation({
    mutationFn: async ({ splits, notes }: { splits: any[]; notes: string }) => {
      if (!receiptFile || !user || !membership) throw new Error("Dados incompletos");
      const ext = receiptFile.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      
      const { error: upErr } = await supabase.storage.from("receipts").upload(path, receiptFile);
      if (upErr) throw upErr;
      
      const { data: urlData } = supabase.storage.from("receipts").getPublicUrl(path);

      const paymentsToInsert = splits.map((split) => ({
        group_id: membership.group_id,
        expense_split_id: split.id,
        paid_by: user.id,
        amount: Number(split.amount),
        receipt_url: urlData.publicUrl,
        notes: notes,
      }));

      const { error } = await supabase.from("payments").insert(paymentsToInsert);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
      queryClient.invalidateQueries({ queryKey: ["my-pending-splits"] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      toast({ title: "Pagamento enviado!", description: "Aguardando confirmação do administrador." });
      setPayRateioOpen(false);
      setPayIndividualOpen(false);
      setSelectedIndividualSplit(null);
      setReceiptFile(null);
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
    onSettled: () => setSaving(false),
  });

  const processData = useMemo(() => {
    if (!dbData) return null;

    const collectiveExpenses = dbData.expenses.filter((e: any) => e.expense_type === "collective");
    const totalMonthExpenses = collectiveExpenses.reduce((sum: number, e: any) => sum + Number(e.amount), 0);

    const republicChartData = Object.entries(
      collectiveExpenses.reduce((acc: any, e: any) => {
        const cat = getCategoryLabel(e.category);
        acc[cat] = (acc[cat] || 0) + Number(e.amount);
        return acc;
      }, {})
    ).map(([name, value]) => ({ name, value: Number(value) }));

    const collectivePending = dbData.pendingSplits.filter((s: any) => s.expenses?.expense_type === "collective" && s.expenses?.group_id === membership?.group_id);
    const individualPending = dbData.pendingSplits.filter((s: any) => s.expenses?.expense_type === "individual");

    const currentCycleStart = cycleStart.getTime();
    const currentCycleEnd = cycleEnd.getTime();

    const collectivePendingCurrent = collectivePending.filter((s: any) => {
      const pd = new Date(s.expenses.purchase_date + "T12:00:00").getTime();
      return pd >= currentCycleStart && pd < currentCycleEnd;
    });

    const collectivePendingPrevious = collectivePending.filter((s: any) => {
      const pd = new Date(s.expenses.purchase_date + "T12:00:00").getTime();
      return pd < currentCycleStart;
    });

    const totalCollectivePendingCurrent = collectivePendingCurrent.reduce((s: number, i: any) => s + Number(i.amount), 0);
    const totalCollectivePendingPrevious = collectivePendingPrevious.reduce((s: number, i: any) => s + Number(i.amount), 0);
    const totalIndividualPending = individualPending.reduce((s: number, i: any) => s + Number(i.amount), 0);

    const previousByCompMap = collectivePendingPrevious.reduce((acc: any, split: any) => {
      const date = new Date(split.expenses.purchase_date + "T12:00:00");
      let m = date.getMonth() + 1;
      let y = date.getFullYear();
      if (date.getDate() >= closingDay) {
        m++; if (m > 12) { m = 1; y++; }
      }
      const comp = `${String(m).padStart(2, '0')}/${y}`;
      if (!acc[comp]) acc[comp] = { competence: comp, total: 0, items: [] };
      acc[comp].total += Number(split.amount);
      acc[comp].items.push(split);
      return acc;
    }, {});

    const myPersonalExpenses = dbData.expenses.filter((e: any) => e.expense_type === "individual" && e.created_by === user?.id);
    const totalPersonalCash = myPersonalExpenses.filter((e: any) => e.payment_method !== "credit_card").reduce((s: number, e: any) => s + Number(e.amount), 0);

    const billInstallments = dbData.installments.filter((i: any) => {
      const card = dbData.cards.find((c: any) => c.id === i.expenses?.credit_card_id);
      if (!card) return false;
      const today = new Date();
      let targetM = today.getMonth() + 1;
      let targetY = today.getFullYear();
      if (today.getDate() >= card.closing_day) {
         targetM++;
         if (targetM > 12) { targetM = 1; targetY++; }
      }
      return i.bill_month === targetM && i.bill_year === targetY;
    });

    const totalBill = billInstallments.reduce((s: number, i: any) => s + Number(i.amount), 0);

    const myCollectiveShare = collectiveExpenses.reduce((sum: number, e: any) => {
      const mySplit = e.expense_splits?.find((s: any) => s.user_id === user?.id);
      return sum + (mySplit ? Number(mySplit.amount) : 0);
    }, 0);

    const personalChartData = Object.entries(
      myPersonalExpenses.reduce((acc: any, e: any) => {
        const cat = getCategoryLabel(e.category);
        acc[cat] = (acc[cat] || 0) + Number(e.amount);
        return acc;
      }, {})
    ).map(([name, value]) => ({ name, value: Number(value) }));

    const cardsBreakdown = billInstallments.reduce((acc: any, i: any) => {
      const cid = i.expenses?.credit_card_id;
      if (cid) acc[cid] = (acc[cid] || 0) + Number(i.amount);
      return acc;
    }, {});

    const cardsChartData = dbData.cards.map((c: any) => ({
      name: c.label,
      value: cardsBreakdown[c.id] || 0
    })).filter((c: any) => c.value > 0);

    return {
      collectiveExpenses, totalMonthExpenses, republicChartData,
      totalCollectivePendingPrevious, totalCollectivePendingCurrent,
      collectivePendingCurrent, collectivePendingPrevious,
      collectivePendingPreviousByCompetence: Object.values(previousByCompMap) as { competence: string; total: number; items: any[]; }[],
      individualPending, totalIndividualPending,
      totalPersonalCash, totalBill, myPersonalExpenses, personalChartData,
      myCollectiveShare, totalUserExpenses: myCollectiveShare + totalPersonalCash + totalBill,
      cardsChartData, cardsBreakdown, billInstallments, creditCards: dbData.cards
    };
  }, [dbData, cycleStart, cycleEnd, closingDay, user?.id, currentDate, membership?.group_id]);

  const handlePayRateioSubmit = () => {
    if (!processData) return;
    setSaving(true);
    const splits = rateioScope === "previous" ? processData.collectivePendingPrevious : processData.collectivePendingCurrent;
    submitPayment.mutate({ splits, notes: `Rateio ${rateioScope === "previous" ? "Atrasado" : "Atual"}` });
  };

  const handlePayIndividualSubmit = () => {
    if (!selectedIndividualSplit) return;
    setSaving(true);
    submitPayment.mutate({ splits: [selectedIndividualSplit], notes: "Pagamento Individual" });
  };

  if (isLoading || !processData) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const tabItems = (
    <>
      <TabsTrigger value="republic" className={tabTriggerClass}>
        <Home className="h-3.5 w-3.5 mr-1.5" /> Resumo da Casa
      </TabsTrigger>
      <TabsTrigger value="personal" className={tabTriggerClass}>
        <Wallet className="h-3.5 w-3.5 mr-1.5" /> Minhas Finanças
      </TabsTrigger>
      <TabsTrigger value="cards" className={tabTriggerClass}>
        <CreditCardIcon className="h-3.5 w-3.5 mr-1.5" /> Meus Cartões
      </TabsTrigger>
    </>
  );

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <div className="space-y-4">
        <DashboardHeader
          userName={profile?.full_name}
          groupName={membership?.group_name}
          currentDate={currentDate}
          cycleStart={cycleStart}
          cycleEnd={cycleEnd}
          cycleLimitDate={cycleLimitDate}
          onNextMonth={() => setCurrentDate(addMonths(currentDate, 1))}
          onPrevMonth={() => setCurrentDate(subMonths(currentDate, 1))}
          compactTabs={<TabsList className={tabListClass}>{tabItems}</TabsList>}
          onCompactChange={setHeroCompact}
        />

        {!heroCompact && (
          <TabsList className={tabListClass}>{tabItems}</TabsList>
        )}

        <TabsContent value="republic" className="m-0">
          <RepublicTab
            collectiveExpenses={processData.collectiveExpenses}
            totalMonthExpenses={processData.totalMonthExpenses}
            republicChartData={processData.republicChartData}
            totalCollectivePendingPrevious={processData.totalCollectivePendingPrevious}
            totalCollectivePendingCurrent={processData.totalCollectivePendingCurrent}
            isLate={isLate}
            onPayRateio={(scope) => { setRateioScope(scope); setPayRateioOpen(true); }}
          />
        </TabsContent>

        <TabsContent value="personal" className="m-0">
          <PersonalTab
            totalIndividualPending={processData.totalIndividualPending}
            totalCollectivePendingPrevious={processData.totalCollectivePendingPrevious}
            totalCollectivePendingCurrent={processData.totalCollectivePendingCurrent}
            collectivePendingPreviousByCompetence={processData.collectivePendingPreviousByCompetence}
            collectivePendingCurrent={processData.collectivePendingCurrent}
            individualPending={processData.individualPending}
            totalPersonalCash={processData.totalPersonalCash}
            totalBill={processData.totalBill}
            totalUserExpenses={processData.totalUserExpenses}
            myCollectiveShare={processData.myCollectiveShare}
            personalChartData={processData.personalChartData}
            myPersonalExpenses={processData.myPersonalExpenses}
          />
        </TabsContent>

        <TabsContent value="cards" className="m-0">
          <CardsTab
            totalBill={processData.totalBill}
            currentDate={currentDate}
            cardsChartData={processData.cardsChartData}
            creditCards={processData.creditCards}
            cardsBreakdown={processData.cardsBreakdown}
            billInstallments={processData.billInstallments}
            isLoading={isLoading}
          />
        </TabsContent>

        <PaymentDialogs
          payRateioOpen={payRateioOpen}
          setPayRateioOpen={setPayRateioOpen}
          payIndividualOpen={payIndividualOpen}
          setPayIndividualOpen={setPayIndividualOpen}
          selectedIndividualSplit={selectedIndividualSplit}
          setSelectedIndividualSplit={setSelectedIndividualSplit}
          collectivePendingByScope={{
            previous: { total: processData.totalCollectivePendingPrevious, items: processData.collectivePendingPrevious },
            current: { total: processData.totalCollectivePendingCurrent, items: processData.collectivePendingCurrent }
          }}
          rateioScope={rateioScope}
          individualPending={processData.individualPending}
          currentDate={currentDate}
          onPayRateio={handlePayRateioSubmit}
          onPayIndividual={handlePayIndividualSubmit}
          saving={saving}
          receiptFile={receiptFile}
          setReceiptFile={setReceiptFile}
        />
      </div>
    </Tabs>
  );
}