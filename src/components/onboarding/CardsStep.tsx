import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, CreditCard, Plus, Trash2 } from "lucide-react";
import { CustomLoader } from "@/components/ui/custom-loader";
import { OnboardingShell } from "./OnboardingShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

interface CardsStepProps {
  totalSteps: number;
  saving: boolean;
  onBack: () => void;
  onFinish: () => void;
}

const cardSchema = z.object({
  label: z.string().min(3, "Mínimo 3 caracteres"),
  brand: z.string().min(1, "Selecione a bandeira"),
  closing_day: z.coerce.number().int().min(1).max(31),
  due_day: z.coerce.number().int().min(1).max(31),
  limit_amount: z.string().optional(),
});
type CardFormValues = z.infer<typeof cardSchema>;

const brandOptions = [
  { value: "visa", label: "Visa" },
  { value: "mastercard", label: "Mastercard" },
  { value: "elo", label: "Elo" },
  { value: "hipercard", label: "Hipercard" },
  { value: "american_express", label: "American Express" },
  { value: "outros", label: "Outros" },
];

interface SavedCard {
  id: string;
  label: string;
  brand: string;
}

export function CardsStep({ totalSteps, saving, onBack, onFinish }: CardsStepProps) {
  const { user } = useAuth();
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [addingCard, setAddingCard] = useState(false);

  const form = useForm<CardFormValues>({
    resolver: zodResolver(cardSchema),
    defaultValues: { label: "", brand: "", closing_day: 5, due_day: 10, limit_amount: "" },
  });

  const handleAddCard = async (values: CardFormValues) => {
    setAddingCard(true);
    try {
      const limitAmount = values.limit_amount ? Number(values.limit_amount) : null;
      const { data, error } = await supabase.from("credit_cards").insert({
        user_id: user!.id,
        label: values.label.trim(),
        brand: values.brand,
        closing_day: values.closing_day,
        due_day: values.due_day,
        limit_amount: limitAmount,
      }).select("id, label, brand").single();
      if (error) throw error;
      setCards((prev) => [...prev, data]);
      form.reset({ label: "", brand: "", closing_day: 5, due_day: 10, limit_amount: "" });
      setShowForm(false);
      toast({ title: "Cartão adicionado" });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setAddingCard(false);
    }
  };

  const handleRemoveCard = async (cardId: string) => {
    await supabase.from("credit_cards").delete().eq("id", cardId);
    setCards((prev) => prev.filter((c) => c.id !== cardId));
  };

  return (
    <OnboardingShell
      step={4}
      totalSteps={totalSteps}
      title="Cartões de Crédito"
      description="Cadastre seus cartões para controle de faturas. Esta etapa é opcional."
    >
      {cards.length > 0 && (
        <div className="space-y-2">
          {cards.map((card) => (
            <Card key={card.id}>
              <CardContent className="flex items-center justify-between py-3 px-4">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">{card.label}</span>
                  <span className="text-xs text-muted-foreground capitalize">{card.brand}</span>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleRemoveCard(card.id)}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showForm ? (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleAddCard)} className="space-y-3 border rounded-lg p-4 bg-muted/30">
            <FormField control={form.control} name="label" render={({ field }) => (
              <FormItem>
                <FormLabel>Apelido do cartão</FormLabel>
                <FormControl><Input {...field} placeholder='Ex: "Nubank"' /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="brand" render={({ field }) => (
              <FormItem>
                <FormLabel>Bandeira</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {brandOptions.map((b) => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="closing_day" render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha dia</FormLabel>
                  <FormControl><Input type="number" {...field} min={1} max={31} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="due_day" render={({ field }) => (
                <FormItem>
                  <FormLabel>Vence dia</FormLabel>
                  <FormControl><Input type="number" {...field} min={1} max={31} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="limit_amount" render={({ field }) => (
              <FormItem>
                <FormLabel>Limite (opcional)</FormLabel>
                <FormControl><Input {...field} placeholder="R$ 0,00" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="flex gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button type="submit" size="sm" disabled={addingCard}>
                {addingCard && <CustomLoader className="h-3.5 w-3.5 mr-1" />}Salvar
              </Button>
            </div>
          </form>
        </Form>
      ) : (
        <Button variant="outline" className="w-full gap-2" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4" /> Adicionar Cartão
        </Button>
      )}

      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={onBack} className="gap-1">
          <ChevronLeft className="h-4 w-4" /> Voltar
        </Button>
        <Button onClick={onFinish} disabled={saving} className="flex-1">
          {saving && <CustomLoader className="h-4 w-4 mr-1" />}
          Concluir Cadastro
        </Button>
      </div>
    </OnboardingShell>
  );
}
