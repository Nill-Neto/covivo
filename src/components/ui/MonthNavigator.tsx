import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MonthYearPicker } from "@/components/ui/month-year-picker";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface MonthNavigatorProps {
  currentDate: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onDateSelect: (date: Date) => void;
}

export function MonthNavigator({
  currentDate,
  onPrevMonth,
  onNextMonth,
  onDateSelect,
}: MonthNavigatorProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);

  return (
    <div className="flex h-10 w-full items-center justify-between rounded-lg border bg-card p-1 shadow-sm sm:w-auto">
      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onPrevMonth}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            className="flex-1 px-2 text-center text-sm font-medium capitalize truncate sm:min-w-[140px] h-8"
          >
            {format(currentDate, "MMMM yyyy", { locale: ptBR })}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <MonthYearPicker
            date={currentDate}
            onDateChange={(date) => {
              onDateSelect(date);
              setPopoverOpen(false);
            }}
            onClose={() => setPopoverOpen(false)}
          />
        </PopoverContent>
      </Popover>
      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onNextMonth}>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}