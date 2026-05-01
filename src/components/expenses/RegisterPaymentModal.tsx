import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CustomLoader } from "@/components/ui/custom-loader";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { FileText, ImageIcon, Trash2 } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type ExpenseRow = Tables<"expenses">;
type CreditCardRow = Tables<"credit_cards">;

const PAYMENT_METHODS = [
  { value: "cash", label: "Dinheiro" },
  { value: "pix", label: "Pix" },
  { value: "debit", label: "Débito" },
  { value: "credit_card", label: "Cartão de Crédito" },
];

interface RegisterPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense: ExpenseRow | null;
  onSuccess: () => void;
  participantOptions: { id: string; name: string }[];
  cards: CreditCardRow[];
}

export function RegisterPaymentModal({
  open,
  onOpenChange,
  expense,
  onSuccess,
  participantOptions,
  cards,
}: RegisterPaymentModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [payerUserId, setPayerUserId] = useState("me");
  const [paymentDate, setPaymentDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [receiptFiles, setReceiptFiles] = useState<File[]>([]);
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [creditCardId, setCreditCardId] = useState<string>("none");

  const registerPaymentMutation = useMutation({
    mutationFn: async ({
      expense,
      payerId,
      paymentDateValue,
      proofFiles,
      paymentMethodValue,
      creditCardIdValue,
    }: {
      expense: ExpenseRow;
      payerId: string;
      paymentDateValue: string;
      proofFiles: File[];
      paymentMethodValue: string;
      creditCardIdValue: string | null;
    }) => {
      const uploadedReceipts: { url: string; mime_type: string; file_name: string }[] = [];
      for (const file of proofFiles) {
        const ext = file.name.split(".").pop() ?? "bin";
        const path = `${user!.id}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
        const { error: uploadError } = await supabase.storage.from("receipts").upload(path, file);
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage.from("receipts").getPublicUrl(path);
        uploadedReceipts.push({
          url: publicUrlData.publicUrl,
          mime_type: file.type,
          file_name: file.name,
        });
      }

      const payerName = payerId === "me"
        ? "Você"
        : participantOptions.find((participant) => participant.id === payerId)?.name || "Morador";
      const historyLine = `quitada por ${payerName} em ${format(new Date(paymentDateValue + "T12:00:00"), "dd/MM")}`;
      const updatedDescription = expense.description
        ? `${expense.description}\n${historyLine}`
        : historyLine;
      
      const actualPayerId = payerId === "me" ? user!.id : payerId;
      const finalCreditCardId = paymentMethodValue === "credit_card" ? creditCardIdValue : null;

      const { error: updateError } = await supabase
        .from("expenses")
        .update({
          paid_to_provider: true,
          due_date: paymentDateValue,
          description: updatedDescription,
          created_by: actualPayerId,
          payment_method: paymentMethodValue,
          credit_card_id: finalCreditCardId,
        })
        .eq("id", expense.id);
      if (updateError) throw updateError;

      if (uploadedReceipts.length > 0) {
        const newReceiptRows = uploadedReceipts.map(r => ({ expense_id: expense.id, ...r }));
        await supabase.from("expense_receipts" as any).insert(newReceiptRows);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["unpaid-bills"] });
      toast({ title: "Pagamento registrado com sucesso." });
      onSuccess();
    },
    onError: (err: any) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
    onSettled: () => {
      setPayerUserId("me");
      setPaymentDate(format(new Date(), "yyyy-MM-dd"));
      setReceiptFiles([]);
      setReceiptError(null);
      setPaymentMethod("cash");
      setCreditCardId("none");
    }
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) {
      setReceiptFiles([]);
      setReceiptError(null);
      return;
    }

    const uniqueFiles = files.filter((file, index, self) =>
      index === self.findIndex((f) => (
        f.name === file.name && f.size === file.size && f.lastModified === file.lastModified
      ))
    );

    const pdfFiles = uniqueFiles.filter(file => file.type === 'application/pdf');
    const imgFiles = uniqueFiles.filter(file => file.type.startsWith('image/'));

    if (pdfFiles.length > 0) {
      if (uniqueFiles.length > 1) {
        setReceiptError("Se incluir um PDF, ele deve ser o único arquivo.");
        e.target.value = '';
        return;
      }
    } else {
      if (imgFiles.length !== uniqueFiles.length) {
        setReceiptError("Apenas arquivos de imagem ou um único PDF são permitidos.");
        e.target.value = '';
        return;
      }
    }

    setReceiptFiles(uniqueFiles);
    setReceiptError(null);
  };

  const handleRegisterPayment = () => {
    if (!expense) return;
    if (!paymentDate) {
      toast({ title: "Erro", description: "Informe a data do pagamento.", variant: "destructive" });
      return;
    }
    if (receiptFiles.length === 0) {
      toast({ title: "Erro", description: "Anexe o comprovante.", variant: "destructive" });
      return;
    }
    if (paymentMethod === "credit_card" && (creditCardId === "none" || !creditCardId)) {
      toast({ title: "Erro", description: "Selecione um cartão de crédito.", variant: "destructive" });
      return;
    }

    registerPaymentMutation.mutate({
      expense,
      payerId: payerUserId,
      paymentDateValue: paymentDate,
      proofFiles: receiptFiles,
      paymentMethodValue: paymentMethod,
      creditCardIdValue: creditCardId,
    });
  };

  const isSubmitDisabled = useMemo(() => {
    if (registerPaymentMutation.isPending || !paymentDate || receiptFiles.length === 0) {
      return true;
    }
    if (paymentMethod === "credit_card" && (creditCardId === "none" || !creditCardId)) {
      return true;
    }
    return false;
  }, [registerPaymentMutation.isPending, paymentDate, receiptFiles, paymentMethod, creditCardId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 gap-0 flex flex-col overflow-hidden max-h-[85vh]">
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0 border-b bg-background">
          <DialogTitle className="font-serif">Registrar pagamento</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Despesa</Label>
            <p className="text-sm font-medium">{expense?.title}</p>
          </div>

          <div className="rounded-lg border bg-muted/20 p-3 space-y-3">
            <Label className="text-base font-medium">Detalhes do Pagamento</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Pagador</Label>
                <Select value={payerUserId} onValueChange={setPayerUserId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="me">Você</SelectItem>
                    {participantOptions.map((participant) => (
                      <SelectItem key={participant.id} value={participant.id}>
                        {participant.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Data</Label>
                <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Forma de Pagamento</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {paymentMethod === "credit_card" && (
                <div className="space-y-2">
                  <Label>Cartão</Label>
                  <Select value={creditCardId} onValueChange={setCreditCardId}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {cards.length === 0 && <SelectItem value="none" disabled>Nenhum cartão</SelectItem>}
                      {cards.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Comprovante(s) *</Label>
            <Input
              id="quick-receipt-upload"
              type="file"
              accept="image/*,.pdf"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
            <Label
              htmlFor="quick-receipt-upload"
              className="flex items-center justify-between w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              <span className="border rounded-md px-2 py-1 text-xs font-semibold bg-background">Escolher arquivos</span>
              <span className="text-muted-foreground text-sm">
                {receiptFiles.length > 0 ? `${receiptFiles.length} arq...` : "Nenhum arquivo"}
              </span>
            </Label>
            <p className="text-xs text-muted-foreground">O comprovante é obrigatório. Envie 1 PDF ou múltiplas imagens.</p>
            {receiptError && <p className="text-sm text-destructive">{receiptError}</p>}
          </div>
          
          {receiptFiles.length > 0 && (
            <div className="space-y-2 pt-2">
              {receiptFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between text-sm bg-background p-2 rounded-md border">
                  <div className="flex items-center gap-2 truncate">
                    {file.type.startsWith('image/') ? <ImageIcon className="h-4 w-4 text-muted-foreground" /> : <FileText className="h-4 w-4 text-muted-foreground" />}
                    <span className="truncate">{file.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground/80 shrink-0">{(file.size / 1024).toFixed(1)} KB</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setReceiptFiles(prev => prev.filter((_, i) => i !== index))} aria-label={`Remover ${file.name}`}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}

              {receiptFiles.length > 1 && (
                <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => setReceiptFiles([])}>
                  Limpar todos
                </Button>
              )}
            </div>
          )}
        </div>
        <div className="px-6 pb-6 pt-4 shrink-0 border-t bg-background">
          <Button
            onClick={handleRegisterPayment}
            disabled={isSubmitDisabled}
            className="w-full"
          >
            {registerPaymentMutation.isPending ? <CustomLoader className="h-4 w-4 mr-2" /> : null}
            Confirmar pagamento
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}