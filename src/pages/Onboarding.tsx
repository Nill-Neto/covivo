import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useInviteFlag } from "@/hooks/useInviteFlag";

import { TermsStep } from "@/components/onboarding/TermsStep";
import { ProfileStep } from "@/components/onboarding/ProfileStep";
import { DocumentsStep } from "@/components/onboarding/DocumentsStep";
import { CardsStep } from "@/components/onboarding/CardsStep";
import { GroupSettingsStep, type GroupAddress } from "@/components/onboarding/GroupSettingsStep";
import { RecurringExpensesStep, type RecurringExpenseEntry } from "@/components/onboarding/RecurringExpensesStep";
import { MandatoryFeesStep, type FeeEntry } from "@/components/onboarding/MandatoryFeesStep";
import { OptionalFeesStep } from "@/components/onboarding/OptionalFeesStep";
import { HouseRulesOnboardingStep, type HouseRuleEntry } from "@/components/onboarding/HouseRulesOnboardingStep";

type Step = "terms" | "profile" | "documents" | "cards" | "groupSettings" | "recurringExpenses" | "mandatoryFees" | "optionalFees" | "houseRules";
type SplittingRule = "equal" | "percentage";

export default function Onboarding() {
  const { user, profile, membership, refreshProfile, refreshMembership } = useAuth();
  const navigate = useNavigate();
  const { hasInvite: inviteFlag, clearInvite } = useInviteFlag();

  const [step, setStep] = useState<Step>("terms");
  const [accepted, setAccepted] = useState(false);

  // Profile fields
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [nickname, setNickname] = useState(profile?.nickname ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");

  // Documents
  const [cpf, setCpf] = useState("");
  const [cpfError, setCpfError] = useState("");
  const [docFiles, setDocFiles] = useState<{ rgFrontUrl: string | null; rgBackUrl: string | null; rgDigitalUrl: string | null } | null>(null);

  // Group settings
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [splittingRule, setSplittingRule] = useState<SplittingRule>("equal");
  const [closingDay, setClosingDay] = useState(1);
  const [dueDay, setDueDay] = useState(10);
  const [address, setAddress] = useState<GroupAddress>({
    street: "", number: "", complement: "",
    neighborhood: "", city: "", state: "", zipCode: "",
  });

  // Recurring expenses
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpenseEntry[]>([]);

  // Fees
  const [mandatoryFees, setMandatoryFees] = useState<FeeEntry[]>([]);
  const [optionalFees, setOptionalFees] = useState<FeeEntry[]>([]);

  // House rules
  const [houseRules, setHouseRules] = useState<HouseRuleEntry[]>([]);

  const [saving, setSaving] = useState(false);

  const hasInviteFlow = useMemo(() => !!membership || inviteFlag, [membership, inviteFlag]);

  // Invited users: 4 steps | New admins: 9 steps
  const totalSteps = hasInviteFlow ? 4 : 9;

  useEffect(() => {
    if (membership) clearInvite();
  }, [membership, clearInvite]);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name);
      setNickname(profile.nickname ?? "");
      setPhone(profile.phone ?? "");
    }
  }, [profile]);

  const handleDocsContinue = (files: { rgFrontUrl: string | null; rgBackUrl: string | null; rgDigitalUrl: string | null }) => {
    setDocFiles(files);
    setStep("cards");
  };

  const handleFinishCards = async () => {
    if (!user) return;
    setSaving(true);
    try {
      // Save CPF
      const cleanedCpf = cpf.replace(/\D/g, "");
      const { error: cpfErr } = await supabase
        .from("profile_sensitive")
        .upsert({
          user_id: user.id,
          cpf: cleanedCpf,
          rg_front_url: docFiles?.rgFrontUrl || null,
          rg_back_url: docFiles?.rgBackUrl || null,
          rg_digital_url: docFiles?.rgDigitalUrl || null,
        });
      if (cpfErr) throw cpfErr;

      // Save profile
      const { error: profileErr } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          nickname: nickname.trim() || null,
          phone: phone.trim(),
          onboarding_completed: hasInviteFlow,
        })
        .eq("id", user.id);
      if (profileErr) throw profileErr;

      if (hasInviteFlow) {
        await refreshProfile();
        toast({ title: "Bem-vindo!", description: "Seu cadastro foi concluído." });
        clearInvite();
        navigate("/dashboard", { replace: true });
      } else {
        setStep("groupSettings");
      }
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleFinishOnboarding = async () => {
    if (!user || !groupName.trim()) {
      toast({ title: "Erro", description: "Informe o nome do grupo.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      // 1. Create group
      const { data: groupId, error: groupErr } = await supabase.rpc("create_group_with_admin", {
        _name: groupName.trim(),
        _description: groupDescription.trim() || null,
        _splitting_rule: splittingRule,
      });
      if (groupErr) throw groupErr;

      // 2. Update group with address + closing/due days
      const { error: updateErr } = await supabase
        .from("groups")
        .update({
          street: address.street.trim() || null,
          street_number: address.number.trim() || null,
          complement: address.complement.trim() || null,
          neighborhood: address.neighborhood.trim() || null,
          city: address.city.trim() || null,
          state: address.state.trim() || null,
          zip_code: address.zipCode.replace(/\D/g, "") || null,
          closing_day: closingDay,
          due_day: dueDay,
        })
        .eq("id", groupId);
      if (updateErr) throw updateErr;

      // 3. Insert recurring expenses
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      nextMonth.setDate(1);
      const nextDueDate = nextMonth.toISOString().slice(0, 10);

      for (const exp of recurringExpenses) {
        if (!exp.title.trim() || !exp.amount) continue;
        const { error } = await supabase.from("recurring_expenses").insert({
          group_id: groupId,
          created_by: user.id,
          title: exp.title.trim(),
          amount: parseFloat(exp.amount),
          category: exp.category || "other",
          frequency: "monthly",
          next_due_date: nextDueDate,
          expense_type: "collective",
        });
        if (error) throw error;
      }

      // 4. Insert fees
      const allFees = [
        ...mandatoryFees.map(f => ({ ...f, fee_type: "mandatory" as const })),
        ...optionalFees.map(f => ({ ...f, fee_type: "optional" as const })),
      ];
      for (const fee of allFees) {
        if (!fee.title.trim() || !fee.amount) continue;
        const { error } = await supabase.from("group_fees").insert({
          group_id: groupId,
          title: fee.title.trim(),
          amount: parseFloat(fee.amount),
          fee_type: fee.fee_type,
          description: fee.description?.trim() || null,
        });
        if (error) throw error;
      }

      // 5. Insert house rules
      for (let i = 0; i < houseRules.length; i++) {
        const rule = houseRules[i];
        if (!rule.title.trim()) continue;
        const { error } = await supabase.from("house_rules").insert({
          group_id: groupId,
          created_by: user.id,
          title: rule.title.trim(),
          description: rule.description?.trim() || null,
          sort_order: i + 1,
        });
        if (error) throw error;
      }

      // 6. Complete onboarding
      await supabase.from("profiles").update({ onboarding_completed: true }).eq("id", user.id);
      await Promise.all([refreshProfile(), refreshMembership()]);

      toast({ title: "Grupo criado!", description: `"${groupName}" está pronto. Convide seus moradores.` });
      clearInvite();
      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  switch (step) {
    case "terms":
      return (
        <TermsStep
          accepted={accepted}
          hasInvite={hasInviteFlow}
          totalSteps={totalSteps}
          onAcceptChange={setAccepted}
          onContinue={() => setStep("profile")}
        />
      );
    case "profile":
      return (
        <ProfileStep
          fullName={fullName}
          nickname={nickname}
          phone={phone}
          totalSteps={totalSteps}
          onFullNameChange={setFullName}
          onNicknameChange={setNickname}
          onPhoneChange={setPhone}
          onBack={() => setStep("terms")}
          onContinue={() => setStep("documents")}
        />
      );
    case "documents":
      return (
        <DocumentsStep
          cpf={cpf}
          cpfError={cpfError}
          totalSteps={totalSteps}
          onCpfChange={setCpf}
          onCpfErrorChange={setCpfError}
          onBack={() => setStep("profile")}
          onContinue={handleDocsContinue}
        />
      );
    case "cards":
      return (
        <CardsStep
          totalSteps={totalSteps}
          saving={saving}
          onBack={() => setStep("documents")}
          onFinish={handleFinishCards}
        />
      );
    case "groupSettings":
      return (
        <GroupSettingsStep
          groupName={groupName}
          address={address}
          groupDescription={groupDescription}
          closingDay={closingDay}
          dueDay={dueDay}
          splittingRule={splittingRule}
          totalSteps={totalSteps}
          onGroupNameChange={setGroupName}
          onAddressChange={setAddress}
          onGroupDescriptionChange={setGroupDescription}
          onClosingDayChange={setClosingDay}
          onDueDayChange={setDueDay}
          onSplittingRuleChange={setSplittingRule}
          onBack={() => setStep("cards")}
          onContinue={() => setStep("recurringExpenses")}
        />
      );
    case "recurringExpenses":
      return (
        <RecurringExpensesStep
          expenses={recurringExpenses}
          totalSteps={totalSteps}
          onExpensesChange={setRecurringExpenses}
          onBack={() => setStep("groupSettings")}
          onContinue={() => setStep("mandatoryFees")}
        />
      );
    case "mandatoryFees":
      return (
        <MandatoryFeesStep
          fees={mandatoryFees}
          totalSteps={totalSteps}
          onFeesChange={setMandatoryFees}
          onBack={() => setStep("recurringExpenses")}
          onContinue={() => setStep("optionalFees")}
        />
      );
    case "optionalFees":
      return (
        <OptionalFeesStep
          fees={optionalFees}
          totalSteps={totalSteps}
          onFeesChange={setOptionalFees}
          onBack={() => setStep("mandatoryFees")}
          onContinue={() => setStep("houseRules")}
        />
      );
    case "houseRules":
      return (
        <HouseRulesOnboardingStep
          rules={houseRules}
          saving={saving}
          totalSteps={totalSteps}
          onRulesChange={setHouseRules}
          onBack={() => setStep("optionalFees")}
          onSubmit={handleFinishOnboarding}
        />
      );
  }
}
