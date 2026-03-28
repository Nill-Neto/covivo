import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { OnboardingShell } from "./OnboardingShell";
import { toast } from "@/hooks/use-toast";

type SplittingRule = "equal" | "percentage";
type HousingContext = "student" | "friends" | "family" | "other";

export interface GroupAddress {
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
}

interface GroupSettingsStepProps {
  groupName: string;
  address: GroupAddress;
  groupDescription: string;
  closingDay: number;
  dueDay: number;
  splittingRule: SplittingRule;
  adminParticipatesInSplits: boolean;
  housingContext: HousingContext;
  totalSteps: number;
  onGroupNameChange: (v: string) => void;
  onAddressChange: (a: GroupAddress) => void;
  onGroupDescriptionChange: (v: string) => void;
  onClosingDayChange: (v: number) => void;
  onDueDayChange: (v: number) => void;
  onSplittingRuleChange: (v: SplittingRule) => void;
  onAdminParticipatesInSplitsChange: (v: boolean) => void;
  onBack: () => void;
  onContinue: () => void;
}

export function GroupSettingsStep({
  groupName, address, groupDescription, closingDay, dueDay, splittingRule, adminParticipatesInSplits, housingContext, totalSteps,
  onGroupNameChange, onAddressChange, onGroupDescriptionChange,
  onClosingDayChange, onDueDayChange, onSplittingRuleChange, onAdminParticipatesInSplitsChange,
  onBack, onContinue,
}: GroupSettingsStepProps) {
  const [fetchingCep, setFetchingCep] = useState(false);

  const fetchAddressByCep = useCallback(async (cep: string) => {
    setFetchingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (!data.erro) {
        onAddressChange({
          ...address,
          zipCode: cep.slice(0, 5) + "-" + cep.slice(5),
          street: data.logradouro || "",
          neighborhood: data.bairro || "",
          city: data.localidade || "",
          state: data.uf || "",
        });
      } else {
        toast({ title: "CEP não encontrado", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erro ao buscar CEP", variant: "destructive" });
    } finally {
      setFetchingCep(false);
    }
  }, [address, onAddressChange]);

  const handleCepChange = (value: string) => {
    const clean = value.replace(/\D/g, "");
    let formatted = clean;
    if (clean.length > 5) {
      formatted = clean.slice(0, 5) + "-" + clean.slice(5, 8);
    }
    onAddressChange({ ...address, zipCode: formatted });
    if (clean.length === 8) {
      fetchAddressByCep(clean);
    }
  };

  const updateAddress = (field: keyof GroupAddress, value: string) => {
    onAddressChange({ ...address, [field]: value });
  };

  const housingCopy: Record<HousingContext, { label: string; placeholder: string }> = {
    student: {
      label: "moradia estudantil",
      placeholder: 'Ex: "Casa Campus Norte"',
    },
    friends: {
      label: "moradia compartilhada com amigos",
      placeholder: 'Ex: "Apê da Vila Mariana"',
    },
    family: {
      label: "moradia compartilhada com familiares",
      placeholder: 'Ex: "Casa da Família Silva"',
    },
    other: {
      label: "moradia compartilhada",
      placeholder: 'Ex: "Residência Centro"',
    },
  };

  return (
    <OnboardingShell
      step={5}
      totalSteps={totalSteps}
      title="Configurações do Grupo"
      description={`Configure os detalhes da sua ${housingCopy[housingContext].label}. Você será o administrador deste grupo.`}
    >
      <div className="space-y-2">
        <Label htmlFor="groupName">Apelido do grupo</Label>
        <Input id="groupName" value={groupName} onChange={(e) => onGroupNameChange(e.target.value)} placeholder={housingCopy[housingContext].placeholder} />
      </div>

      {/* Address */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">Endereço</Label>
        <div className="space-y-2">
          <div className="relative">
            <Input
              placeholder="CEP (ex: 01001-000)"
              value={address.zipCode}
              onChange={(e) => handleCepChange(e.target.value)}
              maxLength={9}
            />
            {fetchingCep && <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
          <Input placeholder="Rua / Logradouro" value={address.street} onChange={(e) => updateAddress("street", e.target.value)} />
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Número" value={address.number} onChange={(e) => updateAddress("number", e.target.value)} />
            <Input placeholder="Complemento" value={address.complement} onChange={(e) => updateAddress("complement", e.target.value)} />
          </div>
          <Input placeholder="Bairro" value={address.neighborhood} onChange={(e) => updateAddress("neighborhood", e.target.value)} />
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Cidade" value={address.city} onChange={(e) => updateAddress("city", e.target.value)} />
            <Input placeholder="UF" value={address.state} onChange={(e) => updateAddress("state", e.target.value)} maxLength={2} />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="groupDesc">Descrição (opcional)</Label>
        <Input id="groupDesc" value={groupDescription} onChange={(e) => onGroupDescriptionChange(e.target.value)} placeholder='Ex: "Moradia estudantil próxima à UNICAMP, 5 quartos"' />
      </div>

      {/* Closing / Due days */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Dia de Fechamento</Label>
          <Input type="number" min={1} max={31} value={closingDay} onChange={(e) => onClosingDayChange(parseInt(e.target.value) || 1)} />
          <p className="text-[10px] text-muted-foreground">
            Lançamentos após este dia entram na competência do mês seguinte.
          </p>
        </div>
        <div className="space-y-2">
          <Label>Dia de Vencimento</Label>
          <Input type="number" min={1} max={31} value={dueDay} onChange={(e) => onDueDayChange(parseInt(e.target.value) || 10)} />
          <p className="text-[10px] text-muted-foreground font-medium">
            Data limite para pagamento será <strong>um dia antes</strong> (Dia {(dueDay - 1) || 30}).
            No dia {dueDay} já será considerado atraso.
          </p>
        </div>
      </div>

      {/* Splitting rule */}
      <div className="space-y-2">
        <Label>Regra de rateio padrão</Label>
        <Select value={splittingRule} onValueChange={(v) => onSplittingRuleChange(v as SplittingRule)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="equal">Divisão igualitária</SelectItem>
            <SelectItem value="percentage">Por peso/percentual</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {splittingRule === "equal"
            ? "Despesas coletivas divididas igualmente entre todos."
            : "Cada integrante terá um percentual definido por você."}
        </p>
      </div>

      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="space-y-0.5">
          <Label className="text-sm font-medium">Participar dos rateios</Label>
          <p className="text-xs text-muted-foreground">
            Desative se você apenas administra o grupo e não participa das despesas.
          </p>
        </div>
        <Switch checked={adminParticipatesInSplits} onCheckedChange={onAdminParticipatesInSplitsChange} />
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="gap-1">
          <ChevronLeft className="h-4 w-4" /> Voltar
        </Button>
        <Button onClick={onContinue} disabled={!groupName.trim()} className="flex-1 gap-1">
          Continuar <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </OnboardingShell>
  );
}
