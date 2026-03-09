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
import { GroupStep } from "@/components/onboarding/GroupStep";

type Step = "terms" | "profile" | "documents" | "cards" | "group";
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

  // Group
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [splittingRule, setSplittingRule] = useState<SplittingRule>("equal");

  const [saving, setSaving] = useState(false);

  const hasInviteFlow = useMemo(() => !!membership || inviteFlag, [membership, inviteFlag]);

  // Invited users: 4 steps (terms, profile, documents, cards)
  // New admins: 5 steps (terms, profile, documents, cards, group)
  const totalSteps = hasInviteFlow ? 4 : 5;

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
        setStep("group");
      }
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      toast({ title: "Erro", description: "Informe o nome do grupo.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.rpc("create_group_with_admin", {
        _name: groupName.trim(),
        _description: groupDescription.trim() || null,
        _splitting_rule: splittingRule,
      });
      if (error) throw error;

      await supabase.from("profiles").update({ onboarding_completed: true }).eq("id", user!.id);
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
    case "group":
      return (
        <GroupStep
          groupName={groupName}
          groupDescription={groupDescription}
          splittingRule={splittingRule}
          saving={saving}
          totalSteps={totalSteps}
          onGroupNameChange={setGroupName}
          onGroupDescriptionChange={setGroupDescription}
          onSplittingRuleChange={setSplittingRule}
          onBack={() => setStep("cards")}
          onSubmit={handleCreateGroup}
        />
      );
  }
}
