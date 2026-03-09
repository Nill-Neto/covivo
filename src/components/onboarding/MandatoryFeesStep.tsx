import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { OnboardingShell } from "./OnboardingShell";

export interface FeeEntry {
  title: string;
  amount: string;
  description: string;
}

interface MandatoryFeesStepProps {
  fees: FeeEntry[];
  totalSteps: number;
  onFeesChange: (fees: FeeEntry[]) => void;
  onBack: () => void;
  onContinue: () => void;
}

export function MandatoryFeesStep({
  fees, totalSteps, onFeesChange, onBack, onContinue,
}: MandatoryFeesStepProps) {
  const addFee = () => onFeesChange([...fees, { title: "", amount: "", description: "" }]);
  const removeFee = (idx: number) => onFeesChange(fees.filter((_, i) => i !== idx));
  const updateFee = (idx: number, field: keyof FeeEntry, value: string) => {
    const updated = [...fees];
    updated[idx] = { ...updated[idx], [field]: value };
    onFeesChange(updated);
  };

  return (
    <OnboardingShell
      step={7}
      totalSteps={totalSteps}
      title="Taxas Extras Obrigatórias"
      description="Taxas fixas cobradas de todos os moradores (ex: taxa de adesão, calção). Serão aplicadas automaticamente a cada morador. Você pode pular e configurar depois."
    >
      <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1">
        {fees.map((fee, idx) => (
          <div key={idx} className="flex flex-col gap-2 rounded-lg border p-3">
            <div className="flex items-center gap-2">
              <Input
                placeholder='Ex: "Taxa de adesão"'
                value={fee.title}
                onChange={(e) => updateFee(idx, "title", e.target.value)}
                className="flex-1"
              />
              <Button variant="ghost" size="icon" onClick={() => removeFee(idx)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-sm text-muted-foreground">R$</span>
                <Input
                  type="number"
                  placeholder="0,00"
                  value={fee.amount}
                  onChange={(e) => updateFee(idx, "amount", e.target.value)}
                  className="pl-9"
                  min={0}
                  step="0.01"
                />
              </div>
              <Input
                placeholder="Descrição (opcional)"
                value={fee.description}
                onChange={(e) => updateFee(idx, "description", e.target.value)}
              />
            </div>
          </div>
        ))}
      </div>

      <Button variant="outline" onClick={addFee} className="w-full gap-1">
        <Plus className="h-4 w-4" /> Adicionar taxa
      </Button>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="gap-1">
          <ChevronLeft className="h-4 w-4" /> Voltar
        </Button>
        <Button onClick={onContinue} className="flex-1 gap-1">
          {fees.length > 0 ? "Continuar" : "Pular"} <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </OnboardingShell>
  );
}
