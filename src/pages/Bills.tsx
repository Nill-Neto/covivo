import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CreditCard, Calendar, ChevronLeft, ChevronRight, Loader2, Download } from "lucide-react";
import { format, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Bills() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedCardId, setSelectedCardId] = useState<string>("all");

  const month = currentDate.getMonth() + 1;
  const year = currentDate.getFullYear();

  const { data: cards = [] } = useQuery({
    queryKey: ["credit-cards", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("credit_cards").select("*").eq("user_id", user!.id);
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: billInstallments = [], isLoading } = useQuery({
    queryKey: ["bill-installments", user?.id, month, year, selectedCardId],
    queryFn: async () => {
      let query = supabase
        .from("personal_expense_installments")
        .select("*, personal_expenses(title, credit_card_id)")
        .eq("user_id", user!.id)
        .eq("bill_month", month)
        .eq("bill_year", year);

      if (selectedCardId !== "all") {
        // Since credit_card_id is on personal_expenses table, we filter results
        const { data } = await query;
        return (data ?? []).filter((i: any) => i.personal_expenses?.credit_card_id === selectedCardId);
      }

      const { data } = await query;
      return data ?? [];
    },
    enabled: !!user,
  });

  const totalBill = billInstallments.reduce((sum, i) => sum + Number(i.amount), 0);

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-serif">Faturas</h1>
          <p className="text-muted-foreground mt-1">Acompanhamento de cartões de crédito.</p>
        </div>
        
        <div className="flex items-center gap-2 bg-card border rounded-lg p-1">
          <Button variant="ghost" size="icon" onClick={handlePrevMonth}><ChevronLeft className="h-4 w-4" /></Button>
          <div className="px-4 text-sm font-medium min-w-[120px] text-center">
            {format(currentDate, "MMMM yyyy", { locale: ptBR })}
          </div>
          <Button variant="ghost" size="icon" onClick={handleNextMonth}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px,1fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Filtrar por Cartão</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedCardId} onValueChange={setSelectedCardId}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os cartões" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os cartões</SelectItem>
                  {cards.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card className="bg-muted/50 border-dashed">
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Total da Fatura</p>
              <p className="text-3xl font-serif mt-2">R$ {totalBill.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground mt-1">{billInstallments.length} parcelas</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Detalhamento da Fatura</CardTitle>
              <CardDescription>Lançamentos para este período.</CardDescription>
            </div>
            <Button variant="outline" size="sm" className="h-8"><Download className="h-3.5 w-3.5 mr-2" /> Exportar</Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : billInstallments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Calendar className="h-10 w-10 mb-4 opacity-20" />
                <p>Nenhum lançamento encontrado para este período.</p>
              </div>
            ) : (
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-4">
                  {billInstallments.map((item: any) => {
                    const card = cards.find(c => c.id === item.personal_expenses?.credit_card_id);
                    return (
                      <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg bg-card/50">
                        <div className="space-y-1">
                          <p className="font-medium">{item.personal_expenses?.title}</p>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px] h-4">
                              Parcela {item.installment_number}
                            </Badge>
                            {card && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <CreditCard className="h-3 w-3" /> {card.label}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg">R$ {Number(item.amount).toFixed(2)}</p>
                          <p className="text-[10px] text-muted-foreground">Lançado no mês {item.bill_month}/{item.bill_year}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}