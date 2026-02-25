import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Users, CreditCard, Shield } from "lucide-react";
import { format, subDays, isAfter, isSameDay, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";

import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { RepublicTab } from "@/components/dashboard/RepublicTab";
import { PersonalTab } from "@/components/dashboard/PersonalTab";
import { CardsTab } from "@/components/dashboard/CardsTab";
import { AdminTab } from "@/components/dashboard/AdminTab";
import { PaymentDialogs } from "@/components/dashboard/PaymentDialogs";
import { getCategoryLabel } from "@/constants/categories";

export default function Dashboard() {
  const { profile, membership, user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const now = new Date();
  
  // Payment State
  const [payRateioOpen, setPayRateioOpen] = useState(false);
  const [payIndividualOpen, setPayIndividualOpen] = useState(false);
  const [selectedIndividualSplit, setSelectedIndividualSplit] = useState<any>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  // --- Group Settings & Initial Date Logic ---
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
      if (today.getDate() >= groupSettings.closing_day) {
        setCurrentDate(addMonths(today, 1));
      } else {
        setCurrentDate(today);
      }
    }
  }, [groupSettings]);

  const cycleStart = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, closingDay);
  const cycleEnd = new Date(currentDate.getFullYear(), currentDate.getMonth(), closingDay);
  
  const cycleDueDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), dueDay);
  const cycleLimitDate = subDays(cycleDueDate, 1);
  const isLate = isAfter(now, cycleLimitDate) && !isSameDay(now, cycleLimitDate);

  // --- Queries ---

  const targetMonth = currentDate.getMonth() + 1;
  const targetYear = currentDate.getFullYear();

  // 1. Fetch ALL Expenses (to get metadata and splits)
  const { data: expensesRaw = [] } = useQuery({
    queryKey: ["expenses-dashboard-raw", membership?.group_id, cycleStart.toISOString(), cycleEnd.toISOString()],
    queryFn: async () => {
      const dbStart = format(cycleStart, "yyyy-MM-dd");
      const dbEnd = format(cycleEnd, "yyyy-MM-dd");

      const { data, error } = await supabase
        .from("expenses")
        .select(`
          *,
          expense_splits (
            id,
            user_id,
            amount,
            status
          )
        `)
        .eq("group_id", membership!.group_id)
        .or(`purchase_date.gte.${dbStart},due_date.gte.${dbStart}`); // Catch items in cycle
      
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!membership?.group_id
  });

  // 2. Fetch ALL Installments for this cycle (for everyone in the group)
  const { data: installmentsInCycle = [] } = useQuery({
    queryKey: ["installments-dashboard-all", membership?.group_id, targetMonth, targetYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expense_installments" as any)
        .select(`
          *,
          expenses!inner(
            id, title, category, expense_type, group_id, created_by, amount, installments, payment_method,
            expense_splits(user_id, amount, status)
          )
        `)
        .eq("expenses.group_id", membership!.group_id)
        .eq("bill_month", targetMonth)
        .eq("bill_year", targetYear);

      if (error) throw error;
      return (data as any[]) ?? [];
    },
    enabled: !!membership?.group_id
  });

  // 3. User Credit Cards (For the Cards tab)
  const { data: creditCards = [] } = useQuery({
    queryKey: ["my-credit-cards", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("credit_cards").select("*").eq("user_id", user!.id);
      return data ?? [];
    },
    enabled: !!user,
  });

  // 4. Admin Data (Members and roles)
  const { data: adminData } = useQuery({
    queryKey: ["admin-dashboard-base", membership?.group_id],
    queryFn: async () => {
      if (!isAdmin || !membership?.group_id) return null;
      const [membersRes, rolesRes] = await Promise.all([
        supabase.from("group_members").select("user_id, active").eq("group_id", membership.group_id).eq("active", true),
        supabase.from("user_roles").select("user_id, role").eq("group_id", membership.group_id)
      ]);
      const userIds = membersRes.data?.map(m => m.user_id) ?? [];
      const { data: profiles } = await supabase.from("group_member_profiles").select("id, full_name, avatar_url").eq("group_id", membership.group_id).in("id", userIds);
      return {
        members: membersRes.data?.map(m => ({
          ...m,
          profile: profiles?.find(p => p.id === m.user_id),
          role: rolesRes.data?.find(r => r.user_id === m.user_id)?.role ?? 'morador'
        })) ?? []
      };
    },
    enabled: !!membership?.group_id && isAdmin
  });

  // --- DATA PROCESSING ---

  const normalizedCycleItems = useMemo(() => {
    // 1. Get CASH expenses in cycle (strictly NOT credit card)
    const dbStartStr = format(cycleStart, "yyyy-MM-dd");
    const dbEndStr = format(cycleEnd, "yyyy-MM-dd");

    const cashItems = expensesRaw
      .filter(e => e.payment_method !== "credit_card" && e.purchase_date >= dbStartStr && e.purchase_date < dbEndStr)
      .map(e => ({
        id: e.id,
        title: e.title,
        amount: Number(e.amount),
        category: e.category,
        expense_type: e.expense_type,
        purchase_date: e.purchase_date,
        created_by: e.created_by,
        is_installment: false,
        splits: (e.expense_splits as any[]) || []
      }));

    // 2. Get installments that belong to this cycle
    const installmentItems = installmentsInCycle.map((i: any) => {
      const e = i.expenses;
      const splits = (e.expense_splits as any[]) || [];
      
      // Calculate each person's portion of THIS installment
      const normalizedSplits = splits.map((s: any) => ({
        ...s,
        amount: (Number(s.amount) / Number(e.amount)) * Number(i.amount)
      }));

      return {
        id: `${e.id}-inst-${i.installment_number}`,
        title: `${e.title} (${i.installment_number}/${e.installments})`,
        amount: Number(i.amount),
        category: e.category,
        expense_type: e.expense_type,
        purchase_date: e.purchase_date, 
        created_by: e.created_by,
        is_installment: true,
        user_id: i.user_id, // Who owns the card
        splits: normalizedSplits
      };
    });

    return [...cashItems, ...installmentItems].sort((a, b) => 
      new Date(b.purchase_date).getTime() - new Date(a.purchase_date).getTime()
    );
  }, [expensesRaw, installmentsInCycle, cycleStart, cycleEnd]);

  // REPUBLIC CALCULATIONS
  const collectiveItems = normalizedCycleItems.filter(e => e.expense_type === "collective");
  const totalMonthExpenses = collectiveItems.reduce((sum, e) => sum + e.amount, 0);
  
  const myCollectiveShare = collectiveItems.reduce((sum, e) => {
    const myPortion = e.splits.find((s: any) => s.user_id === user?.id);
    return sum + (myPortion ? Number(myPortion.amount) : 0);
  }, 0);

  // PENDING CALCULATION (Proportional to installment)
  const collectivePending = useMemo(() => {
    return collectiveItems
      .filter(e => {
        const myPortion = e.splits.find((s: any) => s.user_id === user?.id);
        return myPortion && myPortion.status === 'pending';
      })
      .map(e => {
        const myPortion = e.splits.find((s: any) => s.user_id === user?.id);
        return {
          id: e.id,
          amount: myPortion.amount,
          expenses: { title: e.title }
        };
      });
  }, [collectiveItems, user?.id]);

  const totalCollectivePending = collectivePending.reduce((sum, s) => sum + s.amount, 0);

  const republicChartData = useMemo(() => {
    const cats: Record<string, number> = {};
    collectiveItems.forEach(e => {
      const label = getCategoryLabel(e.category);
      cats[label] = (cats[label] || 0) + e.amount;
    });
    return Object.entries(cats).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [collectiveItems]);

  // PERSONAL CALCULATIONS
  const myPersonalItems = normalizedCycleItems.filter(e => e.created_by === user?.id && e.expense_type === "individual");
  const totalPersonalCash = myPersonalItems.filter(e => !e.is_installment).reduce((sum, e) => sum + e.amount, 0);
  const totalBill = normalizedCycleItems.filter(e => e.is_installment && (e as any).user_id === user?.id).reduce((sum, e) => sum + e.amount, 0);
  const totalUserExpenses = myCollectiveShare + totalBill;

  const personalChartData = useMemo(() => {
    const cats: Record<string, number> = {};
    myPersonalItems.forEach(e => {
      const label = getCategoryLabel(e.category);
      cats[label] = (cats[label] || 0) + e.amount;
    });
    return Object.entries(cats).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [myPersonalItems]);

  // CARDS TAB DATA
  const cardsBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    creditCards.forEach(c => map[c.id] = 0);
    installmentsInCycle.forEach((i: any) => {
      if (i.user_id !== user?.id) return;
      const cId = i.expenses?.credit_card_id;
      if (cId && map[cId] !== undefined) map[cId] += Number(i.amount);
    });
    return map;
  }, [creditCards, installmentsInCycle, user?.id]);

  const cardsChartData = useMemo(() => {
    const cats: Record<string, number> = {};
    installmentsInCycle.forEach((i: any) => {
      if (i.user_id !== user?.id) return;
      const label = getCategoryLabel(i.expenses?.category || "other");
      cats[label] = (cats[label] || 0) + Number(i.amount);
    });
    return Object.entries(cats).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [installmentsInCycle, user?.id]);

  // ADMIN BALANCES (FRONTEND CALCULATED FOR ACCURACY)
  const memberBalances = useMemo(() => {
    if (!adminData?.members) return [];
    return adminData.members.map(m => {
      // Sum of all portions of collective items (cash or installments) that belong to this member
      const total_owed = collectiveItems.reduce((sum, item) => {
        const port = item.splits.find((s: any) => s.user_id === m.user_id);
        return sum + (port ? Number(port.amount) : 0);
      }, 0);

      // Sum of paid portions (status === 'paid')
      const total_paid = collectiveItems.reduce((sum, item) => {
        const port = item.splits.find((s: any) => s.user_id === m.user_id);
        return sum + (port && port.status === 'paid' ? Number(port.amount) : 0);
      }, 0);

      return {
        user_id: m.user_id,
        total_owed,
        total_paid,
        balance: total_paid - total_owed
      };
    });
  }, [adminData?.members, collectiveItems]);

  const handlePayRateio = async () => {
    if (!receiptFile) return;
    setSaving(true);
    try {
      const ext = receiptFile.name.split(".").pop();
      const path = `${user!.id}/${Date.now()}_rateio.${ext}`;
      await supabase.storage.from("receipts").upload(path, receiptFile);
      const { data: urlData } = supabase.storage.from("receipts").getPublicUrl(path);

      await supabase.from("payments").insert({
        group_id: membership!.group_id,
        expense_split_id: null,
        paid_by: user!.id,
        amount: totalCollectivePending,
        receipt_url: urlData.publicUrl,
        notes: `Pagamento de Rateio - ${format(currentDate, "MMMM/yyyy", { locale: ptBR })}`
      });

      toast({ title: "Pagamento enviado!" });
      queryClient.invalidateQueries();
      setPayRateioOpen(false);
      setReceiptFile(null);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <DashboardHeader 
        userName={profile?.full_name}
        groupName={membership?.group_name}
        currentDate={currentDate}
        cycleStart={cycleStart}
        cycleEnd={cycleEnd}
        cycleLimitDate={cycleLimitDate}
        onNextMonth={() => setCurrentDate(addMonths(currentDate, 1))}
        onPrevMonth={() => setCurrentDate(subMonths(currentDate, 1))}
      />

      <Tabs defaultValue={isAdmin ? "admin" : "republic"} className="space-y-6">
        <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent gap-6">
          {isAdmin && (
            <TabsTrigger value="admin" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 py-3 transition-all hover:text-primary">
              <Shield className="h-4 w-4 mr-2" /> Administração
            </TabsTrigger>
          )}
          <TabsTrigger value="republic" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 py-3 transition-all hover:text-primary">
            <Users className="h-4 w-4 mr-2" /> República
          </TabsTrigger>
          <TabsTrigger value="personal" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 py-3 transition-all hover:text-primary">
            <User className="h-4 w-4 mr-2" /> Pessoal
          </TabsTrigger>
          <TabsTrigger value="cards" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 py-3 transition-all hover:text-primary">
            <CreditCard className="h-4 w-4 mr-2" /> Cartões
          </TabsTrigger>
        </TabsList>

        {isAdmin && (
          <TabsContent value="admin" className="space-y-6">
            <AdminTab 
              memberBalances={memberBalances} 
              members={adminData?.members ?? []} 
              pendingPaymentsCount={0} // Placeholder for now or connect to payments query
              collectiveExpenses={collectiveItems}
              totalMonthExpenses={totalMonthExpenses}
              cycleStart={cycleStart}
              cycleEnd={cycleEnd}
              currentDate={currentDate}
            />
          </TabsContent>
        )}

        <TabsContent value="republic" className="space-y-6">
          <RepublicTab
            collectiveExpenses={collectiveItems}
            totalMonthExpenses={totalMonthExpenses}
            republicChartData={republicChartData}
            totalCollectivePending={totalCollectivePending}
            isLate={isLate}
            onPayRateio={() => setPayRateioOpen(true)}
          />
        </TabsContent>

        <TabsContent value="personal" className="space-y-6">
          <PersonalTab
            totalIndividualPending={0} // Future logic: proportional individual pending
            individualPending={[]}
            totalPersonalCash={totalPersonalCash}
            totalBill={totalBill}
            totalUserExpenses={totalUserExpenses}
            myCollectiveShare={myCollectiveShare}
            personalChartData={personalChartData}
            myPersonalExpenses={myPersonalItems}
            onPayIndividual={() => setPayIndividualOpen(true)}
          />
        </TabsContent>

        <TabsContent value="cards" className="space-y-6">
          <CardsTab 
            totalBill={totalBill}
            currentDate={currentDate}
            cardsChartData={cardsChartData}
            creditCards={creditCards}
            cardsBreakdown={cardsBreakdown}
            billInstallments={installmentsInCycle.filter(i => i.user_id === user?.id)}
          />
        </TabsContent>
      </Tabs>

      <PaymentDialogs
        payRateioOpen={payRateioOpen}
        setPayRateioOpen={setPayRateioOpen}
        payIndividualOpen={payIndividualOpen}
        setPayIndividualOpen={setPayIndividualOpen}
        selectedIndividualSplit={selectedIndividualSplit}
        setSelectedIndividualSplit={setSelectedIndividualSplit}
        totalCollectivePending={totalCollectivePending}
        collectivePending={collectivePending}
        individualPending={[]}
        currentDate={currentDate}
        onPayRateio={handlePayRateio}
        onPayIndividual={() => {}}
        saving={saving}
        receiptFile={receiptFile}
        setReceiptFile={setReceiptFile}
      />
    </div>
  );
}