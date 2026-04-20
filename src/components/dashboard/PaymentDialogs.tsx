import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CustomLoader } from "@/components/ui/custom-loader";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { PendingByCompetenceGroup } from "@/lib/collectivePending";

export type RateioScope = "previous" | "current";

type PendingSplit = {
  id: string;
  amount: number;
  originalAmount?: number;
  competenceKey?: string | null;
  expenses?: {
    title?: string | null;
  };
};

interface PaymentDialogsProps {
  payRateioOpen: boolean;
  setPayRateioOpen: (open: boolean) => void;
  payIndividualOpen: boolean;
  setPayIndividualOpen: (open: boolean) => void;
  selectedIndividualSplit: any;
  setSelectedIndividualSplit: (split: any) => void;
  collectivePendingByScope: {
    previous: { total: number; items: PendingSplit[] };
    current: { total: number; items: PendingSplit[] };
  };
  collectivePendingByScopeGrouped: {
    previous: PendingByCompetenceGroup[];
    current: PendingByCompetenceGroup[];
  };
  rateioScope: RateioScope;
  individualPending: any[];
  currentDate: Date;
  onPayRateio: (scope: RateioScope) => void;
  onPayIndividual: () => void;
  saving: boolean;
  receiptFile: File | null;
  setReceiptFile: (file: File | null) => void;
  rateioCurrentAmount: string;
  setRateioCurrentAmount: (value: string) => void;
}

export function PaymentDialogs({
  payRateioOpen,
  setPayRateioOpen,
  payIndividualOpen,
  setPayIndividualOpen,
  selectedIndividualSplit,
  setSelectedIndividualSplit,
  collectivePendingByScope,
  collectivePendingByScopeGrouped,
  rateioScope,
  individualPending,
  currentDate,
  onPayRateio,
  onPayIndividual,
  saving,
  receiptFile,
  setReceiptFile,
  rateioCurrentAmount,
  setRateioCurrentAmount,
}: PaymentDialogsProps) {
  const selectedScopeData = collectivePendingByScope[rateioScope];
  const selectedScopeGroups = collectivePendingByScopeGrouped[rateioScope];
  const selectedScopeLabel = rateioScope === "previous"
    ? "Rateio pendente de competências anteriores"
    : "Rateio da competência atual";

  return (
    <>
      {/* Rateio Payment Dialog */}
      <Dialog open={payRateioOpen} onOpenChange={setPayRateioOpen}>
        <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden flex flex-col max-h-[85vh]">
          <DialogHeader className="px-5 pt-5 pb-4 shrink-0 border-b bg-background">
            <DialogTitle className="text-lg font-semibold text-foreground">
              {selectedScopeLabel}
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-0.5">
              {rateioScope === "previous"
                ? "Pagamento das competências anteriores"
                : `Competência atual (${format(currentDate, "MMMM/yy", { locale: ptBR })})`}
            </p>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            <div className="rounded-lg bg-primary/10 border border-primary/20 px-4 py-3 text-center shrink-0">
              <p className="text-sm text-muted-foreground">Valor total</p>
              <p className="text-2xl font-bold text-primary mt-0.5 tabular-nums">
                R$ {selectedScopeData.total.toFixed(2)}
              </p>
            </div>

            {selectedScopeData.items.length > 0 && (
              <div className="border rounded-lg flex flex-col overflow-hidden shrink-0">
                <div className="px-4 py-2.5 bg-muted/40 border-b shrink-0">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Detalhamento</p>
                </div>
                <div
                  className="max-h-[220px] overflow-y-auto bg-background"
                  onWheel={(e) => {
                    const target = e.currentTarget;
                    const isAtTop = target.scrollTop <= 0;
                    const isAtBottom = Math.abs(target.scrollHeight - target.scrollTop - target.clientHeight) <= 1;

                    if ((isAtTop && e.deltaY < 0) || (isAtBottom && e.deltaY > 0)) {
                      const parent = target.closest('.flex-1.overflow-y-auto');
                      if (parent) {
                        parent.scrollTop += e.deltaY;
                        e.preventDefault();
                      }
                    }
                  }}
                >
                  <div className="divide-y">
                    {selectedScopeGroups.map((group) => (
                      <div key={group.competenceKey ?? "missing-competence"} className="px-4 py-2.5 space-y-1.5">
                        <p className="text-xs font-semibold text-muted-foreground">{group.competenceLabel}</p>
                        {group.items.map((s) => (
                          <div key={s.id} className="flex justify-between text-sm py-0.5 items-center">
                            <div className="truncate pr-3 flex-1 flex flex-col">
                              <span className="truncate text-foreground">{s.expenses?.title}</span>
                              {s.originalAmount && s.originalAmount > s.amount && (
                                <span className="text-[10px] text-muted-foreground">Original: R$ {Number(s.originalAmount).toFixed(2)}</span>
                              )}
                            </div>
                            <span className="font-medium tabular-nums text-foreground">R$ {Number(s.amount).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2 shrink-0">
              <Label htmlFor="rateio-amount" className="text-sm font-medium">Valor pago (R$) *</Label>
              <Input
                id="rateio-amount"
                type="number"
                min={0.01}
                step="0.01"
                max={rateioScope === "previous" ? selectedScopeData.total : undefined}
                inputMode="decimal"
                value={rateioCurrentAmount}
                onChange={(e) => setRateioCurrentAmount(e.target.value)}
                placeholder="0,00"
              />
              <p className="text-xs text-muted-foreground">
                {rateioScope === "previous"
                  ? "Você pode fazer um pagamento parcial ou integral das pendências anteriores."
                  : "Você pode informar qualquer valor acima de zero. Se pagar a mais, o excedente vira crédito."}
              </p>
            </div>

            <div className="space-y-2 shrink-0">
              <Label className="text-sm font-medium">Comprovante *</Label>
              <Input type="file" accept="image/*,.pdf" onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)} className="cursor-pointer" />
            </div>
          </div>

          <div className="px-5 pb-5 pt-4 shrink-0 border-t bg-background">
            <div className="flex justify-end gap-2 w-full">
              <Button variant="outline" onClick={() => setPayRateioOpen(false)}>Cancelar</Button>
              <Button
                onClick={() => onPayRateio(rateioScope)}
                disabled={saving || !receiptFile || !rateioCurrentAmount}
              >
                {saving && <CustomLoader className="h-4 w-4 mr-2" />} Enviar Comprovante
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Individual Payment Dialog */}
      <Dialog open={payIndividualOpen} onOpenChange={(v) => { if (!v) { setPayIndividualOpen(false); setSelectedIndividualSplit(null); } else setPayIndividualOpen(true); }}>
        <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden flex flex-col max-h-[85vh]">
          <DialogHeader className="px-5 pt-5 pb-4 shrink-0 border-b bg-background">
            <DialogTitle className="text-lg font-semibold text-foreground">
              {selectedIndividualSplit ? "Confirmar Pagamento" : "Pagar Individual"}
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-0.5">
              {selectedIndividualSplit ? selectedIndividualSplit.expenses?.title : "Selecione a despesa para pagar"}
            </p>
          </DialogHeader>

          {!selectedIndividualSplit ? (
            <div className="flex-1 overflow-y-auto">
              <div className="divide-y px-2">
                {individualPending.map((s: any) => (
                  <div key={s.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-muted/30 transition-colors">
                    <div className="min-w-0 pr-3">
                      <p className="text-sm font-medium truncate text-foreground">{s.expenses?.title}</p>
                      <p className="text-xs text-muted-foreground tabular-nums">R$ {Number(s.amount).toFixed(2)}</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => setSelectedIndividualSplit(s)}>Pagar</Button>
                  </div>
                ))}
                {individualPending.length === 0 && (
                  <p className="text-center text-muted-foreground py-8 text-sm">Sem pendências.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              <div className="rounded-lg bg-primary/10 border border-primary/20 px-4 py-3 text-center">
                <p className="text-sm text-muted-foreground">{selectedIndividualSplit.expenses?.title}</p>
                <p className="text-2xl font-bold text-primary mt-0.5 tabular-nums">
                  R$ {Number(selectedIndividualSplit.amount).toFixed(2)}
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Comprovante *</Label>
                <Input type="file" accept="image/*,.pdf" onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)} className="cursor-pointer" />
              </div>
            </div>
          )}
          
          {selectedIndividualSplit && (
            <div className="px-5 pb-5 pt-4 shrink-0 border-t bg-background">
              <div className="flex justify-end gap-2 w-full">
                <Button variant="outline" onClick={() => setSelectedIndividualSplit(null)}>Voltar</Button>
                <Button onClick={onPayIndividual} disabled={saving || !receiptFile}>
                  {saving && <CustomLoader className="h-4 w-4 mr-2" />} Enviar Comprovante
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
