import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronLeft, ChevronRight, Upload, Check, FileText } from "lucide-react";
import { CustomLoader } from "@/components/ui/custom-loader";
import { OnboardingShell } from "./OnboardingShell";
import { formatCPF, isValidCPF } from "@/lib/cpf";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

interface DocumentsStepProps {
  cpf: string;
  cpfError: string;
  totalSteps: number;
  onCpfChange: (v: string) => void;
  onCpfErrorChange: (v: string) => void;
  onBack: () => void;
  onContinue: (files: { rgFrontUrl: string | null; rgBackUrl: string | null; rgDigitalUrl: string | null }) => void;
}

export function DocumentsStep({
  cpf, cpfError, totalSteps,
  onCpfChange, onCpfErrorChange,
  onBack, onContinue,
}: DocumentsStepProps) {
  const { user } = useAuth();
  const [rgFront, setRgFront] = useState<File | null>(null);
  const [rgBack, setRgBack] = useState<File | null>(null);
  const [rgDigital, setRgDigital] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const frontRef = useRef<HTMLInputElement>(null);
  const backRef = useRef<HTMLInputElement>(null);
  const digitalRef = useRef<HTMLInputElement>(null);

  const handleCpfChange = (value: string) => {
    onCpfChange(formatCPF(value));
    onCpfErrorChange("");
  };

  const hasRgImages = rgFront && rgBack;
  const hasRgDigital = !!rgDigital;
  const hasDocuments = hasRgImages || hasRgDigital;

  const cleanedCpf = cpf.replace(/\D/g, "");
  const cpfValid = cleanedCpf.length === 11 && isValidCPF(cleanedCpf);
  const canContinue = cpfValid && hasDocuments;

  const uploadFile = async (file: File, path: string): Promise<string> => {
    const { error } = await supabase.storage.from("documents").upload(path, file, { upsert: true });
    if (error) throw error;
    return path;
  };

  const handleContinue = async () => {
    if (!cpfValid) {
      onCpfErrorChange("CPF inválido. Verifique os dígitos.");
      return;
    }
    if (!hasDocuments) {
      toast({ title: "Documentos obrigatórios", description: "Envie frente e verso do RG, ou o RG digital.", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      let rgFrontUrl: string | null = null;
      let rgBackUrl: string | null = null;
      let rgDigitalUrl: string | null = null;

      const userId = user!.id;

      if (hasRgDigital && rgDigital) {
        rgDigitalUrl = await uploadFile(rgDigital, `${userId}/rg-digital.pdf`);
      }
      if (rgFront) {
        const ext = rgFront.name.split(".").pop() || "jpg";
        rgFrontUrl = await uploadFile(rgFront, `${userId}/rg-front.${ext}`);
      }
      if (rgBack) {
        const ext = rgBack.name.split(".").pop() || "jpg";
        rgBackUrl = await uploadFile(rgBack, `${userId}/rg-back.${ext}`);
      }

      onContinue({ rgFrontUrl, rgBackUrl, rgDigitalUrl });
    } catch (err: any) {
      toast({ title: "Erro no upload", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <OnboardingShell
      step={3}
      totalSteps={totalSteps}
      title="Documentação"
      description="Informe seu CPF e envie uma cópia do RG."
    >
      <div className="space-y-2">
        <Label htmlFor="cpf">CPF *</Label>
        <Input
          id="cpf"
          value={cpf}
          onChange={(e) => handleCpfChange(e.target.value)}
          placeholder="000.000.000-00"
          maxLength={14}
          className={cpfError ? "border-destructive" : ""}
        />
        {cpfError && <p className="text-sm text-destructive">{cpfError}</p>}
        <p className="text-xs text-muted-foreground">Visível apenas para você e o administrador do grupo.</p>
      </div>

      <div className="space-y-3">
        <Label>RG — Frente e Verso (imagens)</Label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <input
              ref={frontRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setRgFront(e.target.files?.[0] || null)}
            />
            <Button
              type="button"
              variant={rgFront ? "default" : "outline"}
              className="w-full gap-2 h-auto py-3"
              onClick={() => frontRef.current?.click()}
            >
              {rgFront ? <Check className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
              <span className="text-xs">{rgFront ? "Frente ✓" : "Frente"}</span>
            </Button>
          </div>
          <div>
            <input
              ref={backRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setRgBack(e.target.files?.[0] || null)}
            />
            <Button
              type="button"
              variant={rgBack ? "default" : "outline"}
              className="w-full gap-2 h-auto py-3"
              onClick={() => backRef.current?.click()}
            >
              {rgBack ? <Check className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
              <span className="text-xs">{rgBack ? "Verso ✓" : "Verso"}</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Ou RG Digital (PDF do GOV.br)</Label>
        <input
          ref={digitalRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => setRgDigital(e.target.files?.[0] || null)}
        />
        <Button
          type="button"
          variant={rgDigital ? "default" : "outline"}
          className="w-full gap-2"
          onClick={() => digitalRef.current?.click()}
        >
          {rgDigital ? <Check className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
          {rgDigital ? rgDigital.name : "Selecionar PDF"}
        </Button>
        <p className="text-xs text-muted-foreground">Opcional se já enviou frente e verso acima.</p>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="gap-1">
          <ChevronLeft className="h-4 w-4" /> Voltar
        </Button>
        <Button onClick={handleContinue} disabled={!canContinue || uploading} className="flex-1">
          {uploading ? <CustomLoader className="h-4 w-4" /> : null}
          Próximo <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </OnboardingShell>
  );
}
