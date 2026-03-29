import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useInviteFlag } from "@/hooks/useInviteFlag";

import { TermsStep } from "@/components/onboarding/TermsStep";
import { ProfileStep, type HousingContext } from "@/components/onboarding/ProfileStep";
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
  const [housingContext, setHousingContext] = useState<HousingContext>("student");

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
  const [adminParticipatesInSplits, setAdminParticipatesInSplits] = useState(true);
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
        toast({ title: "Bem-vindo!", description: "Seu cadastro foi concluído com sucesso." });
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
      // Filtra entradas vazias e converte valores financeiros para Float
      const validRecurring = recurringExpenses
        .filter((e) => e.title.trim() !== "")
        .map((e) => ({
          title: e.title,
          amount: parseFloat(e.amount.replace(",", ".")) || 0,
          category: e.category,
        }));

      const validMandatory = mandatoryFees
        .filter((f) => f.title.trim() !== "")
        .map((f) => ({
          title: f.title,
          amount: parseFloat(f.amount.replace(",", ".")) || 0,
          description: f.description,
          fee_type: "mandatory" as const,
        }));

      const validOptional = optionalFees
        .filter((f) => f.title.trim() !== "")
        .map((f) => ({
          title: f.title,
          amount: parseFloat(f.amount.replace(",", ".")) || 0,
          description: f.description,
          fee_type: "optional" as const,
        }));

      const allFees = [...validMandatory, ...validOptional];
      const validHouseRules = houseRules.filter((r) => r.title.trim() !== "");

      // 1. Cria o grupo e define o admin via RPC nativo
      const { data: newGroupId, error: createError } = await supabase.rpc("create_group_with_admin", {
        _name: groupName.trim(),
        _description: groupDescription.trim() || null,
        _splitting_rule: splittingRule,
      });

      if (createError) throw createError;

      // Try...catch interno para realizar rollback manual no frontend
      try {
        // 2. Atualiza as configurações de endereço e dias de fechamento
        const { error: updateGroupErr } = await supabase.from("groups").update({
          closing_day: closingDay,
          due_day: dueDay,
          street: address.street.trim() || null,
          street_number: address.number.trim() || null,
          complement: address.complement.trim() || null,
          neighborhood: address.neighborhood.trim() || null,
          city: address.city.trim() || null,
          state: address.state.trim() || null,
          zip_code: address.zipCode.replace(/\D/g, "") || null,
        }).eq("id", newGroupId as string);
        if (updateGroupErr) throw updateGroupErr;

        // 3. Atualiza se o admin entra nos rateios por padrão
        const { error: memberErr } = await supabase.from("group_members")
          .update({ participates_in_splits: adminParticipatesInSplits })
          .eq("group_id", newGroupId as string)
          .eq("user_id", user.id);
        if (memberErr) throw memberErr;

        // 4. Insere despesas recorrentes
        if (validRecurring.length > 0) {
          const today = new Date();
          let nextDue = new Date(today.getFullYear(), today.getMonth(), dueDay);
          if (nextDue <= today) nextDue.setMonth(nextDue.getMonth() + 1);

          const { error: recErr } = await supabase.from("recurring_expenses").insert(
            validRecurring.map(e => ({
              ...e,
              group_id: newGroupId as string,
              created_by: user.id,
              active: true,
              expense_type: "collective",
              frequency: "monthly",
              day_of_month: dueDay,
              next_due_date: nextDue.toISOString().split('T')[0],
            }))
          );
          if (recErr) throw recErr;
        }

        // 5. Insere taxas obrigatórias/opcionais
        if (allFees.length > 0) {
          const { error: feeErr } = await supabase.from("group_fees").insert(
            allFees.map(f => ({
              ...f,
              group_id: newGroupId as string,
              active: true,
            }))
          );
          if (feeErr) throw feeErr;
        }

        // 6. Insere as regras da casa
        if (validHouseRules.length > 0) {
          const { error: ruleErr } = await supabase.from("house_rules").insert(
            validHouseRules.map((r, i) => ({
              ...r,
              group_id: newGroupId as string,
              created_by: user.id,
              sort_order: i,
              active: true,
            }))
          );
          if (ruleErr) throw ruleErr;
        }

        // 7. Salva a conclusão do onboarding no perfil
        const { error: profileErr } = await supabase.from("profiles")
          .update({ onboarding_completed: true })
          .eq("id", user.id);
        if (profileErr) throw profileErr;

      } catch (innerError) {
        // Rollback de segurança
        await supabase.from("groups").delete().eq("id", newGroupId as string);
        throw innerError;
      }

      await Promise.all([refreshProfile(), refreshMembership()]);

      const contextLabelMap: Record<HousingContext, string> = {
        student: "moradia estudantil",
        friends: "moradia compartilhada com amigos",
        family: "moradia compartilhada com familiares",
        other: "moradia compartilhada",
      };

      toast({
        title: "Grupo criado!",
        description: `"${groupName}" está pronto para sua ${contextLabelMap[housingContext]}. Convide as pessoas do grupo.`,
      });
      clearInvite();
      navigate("/dashboard", { replace: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Falha inesperada ao finalizar onboarding.";
      toast({ title: "Erro", description: message, variant: "destructive" });
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
          housingContext={housingContext}
          totalSteps={totalSteps}
          onFullNameChange={setFullName}
          onNicknameChange={setNickname}
          onPhoneChange={setPhone}
          onHousingContextChange={setHousingContext}
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
          adminParticipatesInSplits={adminParticipatesInSplits}
          housingContext={housingContext}
          totalSteps={totalSteps}
          onGroupNameChange={setGroupName}
          onAddressChange={setAddress}
          onGroupDescriptionChange={setGroupDescription}
          onClosingDayChange={setClosingDay}
          onDueDayChange={setDueDay}
          onSplittingRuleChange={setSplittingRule}
          onAdminParticipatesInSplitsChange={setAdminParticipatesInSplits}
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