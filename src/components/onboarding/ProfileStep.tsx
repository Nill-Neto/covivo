import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { OnboardingShell } from "./OnboardingShell";

interface ProfileStepProps {
  fullName: string;
  nickname: string;
  phone: string;
  totalSteps: number;
  onFullNameChange: (v: string) => void;
  onNicknameChange: (v: string) => void;
  onPhoneChange: (v: string) => void;
  onBack: () => void;
  onContinue: () => void;
}

export function ProfileStep({
  fullName, nickname, phone, totalSteps,
  onFullNameChange, onNicknameChange, onPhoneChange,
  onBack, onContinue,
}: ProfileStepProps) {
  const canContinue = fullName.trim().length > 0 && phone.trim().length > 0;

  return (
    <OnboardingShell
      step={2}
      totalSteps={totalSteps}
      title="Seus Dados"
      description="Preencha seu perfil. O nome deve ser igual ao documento de identidade."
    >
      <div className="space-y-2">
        <Label htmlFor="fullName">Nome completo *</Label>
        <Input
          id="fullName"
          value={fullName}
          onChange={(e) => onFullNameChange(e.target.value)}
          placeholder="Igual ao documento de identidade"
        />
        <p className="text-xs text-muted-foreground">Deve corresponder ao nome no RG/CPF.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="nickname">Apelido (opcional)</Label>
        <Input
          id="nickname"
          value={nickname}
          onChange={(e) => onNicknameChange(e.target.value)}
          placeholder="Como prefere ser chamado"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Telefone *</Label>
        <Input
          id="phone"
          value={phone}
          onChange={(e) => onPhoneChange(e.target.value)}
          placeholder="(00) 00000-0000"
        />
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="gap-1">
          <ChevronLeft className="h-4 w-4" /> Voltar
        </Button>
        <Button onClick={onContinue} disabled={!canContinue} className="flex-1">
          Próximo <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </OnboardingShell>
  );
}
