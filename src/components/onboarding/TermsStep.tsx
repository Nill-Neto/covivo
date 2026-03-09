import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ChevronRight } from "lucide-react";
import { OnboardingShell } from "./OnboardingShell";

interface TermsStepProps {
  accepted: boolean;
  hasInvite: boolean;
  totalSteps: number;
  onAcceptChange: (value: boolean) => void;
  onContinue: () => void;
}

export function TermsStep({ accepted, hasInvite, totalSteps, onAcceptChange, onContinue }: TermsStepProps) {
  return (
    <OnboardingShell
      step={1}
      totalSteps={totalSteps}
      title="Termos de Uso"
      description={
        hasInvite
          ? "Você foi convidado para uma moradia. Leia e aceite os termos para continuar."
          : "Ao continuar, você será o administrador de uma nova moradia."
      }
    >
      <div className="rounded-lg border bg-muted/50 p-4 text-sm text-muted-foreground max-h-60 overflow-y-auto space-y-3">
        <p><strong>1. Dados pessoais:</strong> Seu CPF e documentos serão armazenados de forma segura e visíveis apenas para você e o administrador do seu grupo.</p>
        <p><strong>2. Despesas:</strong> O administrador é responsável por registrar despesas coletivas e definir regras de rateio.</p>
        <p><strong>3. Comprovantes:</strong> Pagamentos devem ser acompanhados de comprovantes (fotos) para prestação de contas.</p>
        <p><strong>4. Transparência:</strong> Todas as movimentações financeiras são registradas e visíveis aos membros do grupo.</p>
        <p><strong>5. Sugestões:</strong> Moradores podem sugerir alterações, que serão avaliadas pelo administrador.</p>
        <p><strong>6. Saída:</strong> Ao deixar o grupo, você poderá exportar todo o seu histórico de dados.</p>
      </div>

      <div className="flex items-center gap-3">
        <Checkbox
          id="accept"
          checked={accepted}
          onCheckedChange={(checked) => onAcceptChange(checked === true)}
        />
        <Label htmlFor="accept" className="text-sm cursor-pointer">
          Li e concordo com os termos de uso
        </Label>
      </div>

      <Button onClick={onContinue} disabled={!accepted} className="w-full" size="lg">
        Continuar <ChevronRight className="h-4 w-4" />
      </Button>
    </OnboardingShell>
  );
}
