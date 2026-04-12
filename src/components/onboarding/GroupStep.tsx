import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft } from "lucide-react";
import { CustomLoader } from "@/components/ui/custom-loader";
import { OnboardingShell } from "./OnboardingShell";

type SplittingRule = "equal" | "percentage";

interface GroupStepProps {
  groupName: string;
  groupDescription: string;
  splittingRule: SplittingRule;
  saving: boolean;
  totalSteps: number;
  onGroupNameChange: (v: string) => void;
  onGroupDescriptionChange: (v: string) => void;
  onSplittingRuleChange: (v: SplittingRule) => void;
  onBack: () => void;
  onSubmit: () => void;
}

export function GroupStep({
  groupName, groupDescription, splittingRule, saving, totalSteps,
  onGroupNameChange, onGroupDescriptionChange, onSplittingRuleChange,
  onBack, onSubmit,
}: GroupStepProps) {
  return (
    <OnboardingShell
      step={5}
      totalSteps={totalSteps}
      title="Criar Moradia"
      description="Você será o administrador deste grupo. Configure os detalhes da moradia."
    >
      <div className="space-y-2">
        <Label htmlFor="groupName">Nome da moradia</Label>
        <Input id="groupName" value={groupName} onChange={(e) => onGroupNameChange(e.target.value)} placeholder='Ex: "Casa Aurora"' />
      </div>

      <div className="space-y-2">
        <Label htmlFor="groupDesc">Descrição (opcional)</Label>
        <Input id="groupDesc" value={groupDescription} onChange={(e) => onGroupDescriptionChange(e.target.value)} placeholder="Endereço ou detalhes" />
      </div>

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
            : "Cada morador terá um percentual definido por você."}
        </p>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="gap-1">
          <ChevronLeft className="h-4 w-4" /> Voltar
        </Button>
        <Button onClick={onSubmit} disabled={saving || !groupName.trim()} className="flex-1">
          {saving && <CustomLoader className="h-4 w-4 mr-1" />}
          Criar Grupo
        </Button>
      </div>
    </OnboardingShell>
  );
}
