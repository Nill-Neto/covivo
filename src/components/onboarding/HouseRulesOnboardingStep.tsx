import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, Plus, Trash2 } from "lucide-react";
import { CustomLoader } from "@/components/ui/custom-loader";
import { OnboardingShell } from "./OnboardingShell";

export interface HouseRuleEntry {
  title: string;
  description: string;
}

interface HouseRulesOnboardingStepProps {
  rules: HouseRuleEntry[];
  saving: boolean;
  totalSteps: number;
  onRulesChange: (rules: HouseRuleEntry[]) => void;
  onBack: () => void;
  onSubmit: () => void;
}

export function HouseRulesOnboardingStep({
  rules, saving, totalSteps, onRulesChange, onBack, onSubmit,
}: HouseRulesOnboardingStepProps) {
  const addRule = () => onRulesChange([...rules, { title: "", description: "" }]);
  const removeRule = (idx: number) => onRulesChange(rules.filter((_, i) => i !== idx));
  const updateRule = (idx: number, field: keyof HouseRuleEntry, value: string) => {
    const updated = [...rules];
    updated[idx] = { ...updated[idx], [field]: value };
    onRulesChange(updated);
  };

  return (
    <OnboardingShell
      step={9}
      totalSteps={totalSteps}
      title="Regras da Casa"
      description="Defina as regras de convivência da moradia (opcional). Você pode editar depois nas configurações do grupo."
    >
      <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1">
        {rules.map((rule, idx) => (
          <div key={idx} className="flex flex-col gap-2 rounded-lg border p-3">
            <div className="flex items-center gap-2">
              <Input
                placeholder='Ex: "Silêncio após 22h"'
                value={rule.title}
                onChange={(e) => updateRule(idx, "title", e.target.value)}
                className="flex-1"
              />
              <Button variant="ghost" size="icon" onClick={() => removeRule(idx)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
            <Textarea
              placeholder="Descrição ou detalhes da regra (opcional)"
              value={rule.description}
              onChange={(e) => updateRule(idx, "description", e.target.value)}
              rows={2}
            />
          </div>
        ))}
      </div>

      <Button variant="outline" onClick={addRule} className="w-full gap-1">
        <Plus className="h-4 w-4" /> Adicionar regra
      </Button>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="gap-1">
          <ChevronLeft className="h-4 w-4" /> Voltar
        </Button>
        <Button onClick={onSubmit} disabled={saving} className="flex-1">
          {saving && <CustomLoader className="h-4 w-4 mr-1" />}
          Criar Grupo
        </Button>
      </div>
    </OnboardingShell>
  );
}
