import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { OnboardingShell } from "./OnboardingShell";

export interface RecurringExpenseEntry {
  title: string;
  amount: string;
  category: string;
}

const CATEGORIES = [
  { value: "rent", label: "Aluguel" },
  { value: "internet", label: "Internet" },
  { value: "water", label: "Água" },
  { value: "electricity", label: "Luz" },
  { value: "gas", label: "Gás" },
  { value: "condominium", label: "Condomínio" },
  { value: "iptu", label: "IPTU" },
  { value: "other", label: "Outro" },
];

interface RecurringExpensesStepProps {
  expenses: RecurringExpenseEntry[];
  totalSteps: number;
  onExpensesChange: (expenses: RecurringExpenseEntry[]) => void;
  onBack: () => void;
  onContinue: () => void;
}

export function RecurringExpensesStep({
  expenses, totalSteps, onExpensesChange, onBack, onContinue,
}: RecurringExpensesStepProps) {
  const addExpense = () => {
    onExpensesChange([...expenses, { title: "", amount: "", category: "other" }]);
  };

  const removeExpense = (idx: number) => {
    onExpensesChange(expenses.filter((_, i) => i !== idx));
  };

  const updateExpense = (idx: number, field: keyof RecurringExpenseEntry, value: string) => {
    const updated = [...expenses];
    updated[idx] = { ...updated[idx], [field]: value };
    onExpensesChange(updated);
  };

  return (
    <OnboardingShell
      step={6}
      totalSteps={totalSteps}
      title="Despesas Recorrentes"
      description="Cadastre as despesas fixas mensais que serão rateadas entre os moradores (ex: aluguel, internet). Você pode pular e adicionar depois."
    >
      <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1">
        {expenses.map((exp, idx) => (
          <div key={idx} className="flex flex-col gap-2 rounded-lg border p-3">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Nome da despesa"
                value={exp.title}
                onChange={(e) => updateExpense(idx, "title", e.target.value)}
                className="flex-1"
              />
              <Button variant="ghost" size="icon" onClick={() => removeExpense(idx)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-sm text-muted-foreground">R$</span>
                <Input
                  type="number"
                  placeholder="0,00"
                  value={exp.amount}
                  onChange={(e) => updateExpense(idx, "amount", e.target.value)}
                  className="pl-9"
                  min={0}
                  step="0.01"
                />
              </div>
              <Select value={exp.category} onValueChange={(v) => updateExpense(idx, "category", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ))}
      </div>

      <Button variant="outline" onClick={addExpense} className="w-full gap-1">
        <Plus className="h-4 w-4" /> Adicionar despesa
      </Button>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="gap-1">
          <ChevronLeft className="h-4 w-4" /> Voltar
        </Button>
        <Button onClick={onContinue} className="flex-1 gap-1">
          {expenses.length > 0 ? "Continuar" : "Pular"} <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </OnboardingShell>
  );
}
