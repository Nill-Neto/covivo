import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function MonthYearPicker({
  date,
  onDateChange,
  onClose,
}: {
  date: Date;
  onDateChange: (date: Date) => void;
  onClose?: () => void;
}) {
  const [viewDate, setViewDate] = React.useState(date);

  const handleYearChange = (year: string) => {
    const newDate = new Date(viewDate);
    newDate.setFullYear(parseInt(year));
    setViewDate(newDate);
  };

  const handleMonthClick = (month: number) => {
    const newDate = new Date(viewDate);
    newDate.setMonth(month);
    onDateChange(newDate);
    onClose?.();
  };

  const currentYear = viewDate.getFullYear();
  const years = Array.from({ length: 21 }, (_, i) => currentYear - 10 + i);

  const months = [
    "jan", "fev", "mar", "abr", "mai", "jun",
    "jul", "ago", "set", "out", "nov", "dez"
  ];

  return (
    <div className="p-3 w-64">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setViewDate(new Date(viewDate.setFullYear(viewDate.getFullYear() - 1)))}
          className={cn(buttonVariants({ variant: "outline" }), "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100")}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <Select value={String(currentYear)} onValueChange={handleYearChange}>
          <SelectTrigger className="w-[100px] h-8 text-sm font-medium">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map(year => (
              <SelectItem key={year} value={String(year)}>{year}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <button
          onClick={() => setViewDate(new Date(viewDate.setFullYear(viewDate.getFullYear() + 1)))}
          className={cn(buttonVariants({ variant: "outline" }), "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100")}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {months.map((month, index) => (
          <button
            key={month}
            onClick={() => handleMonthClick(index)}
            className={cn(
              "p-2 text-sm rounded-md text-center capitalize",
              date.getFullYear() === currentYear && date.getMonth() === index
                ? "bg-primary text-primary-foreground"
                : "hover:bg-accent hover:text-accent-foreground"
            )}
          >
            {month}
          </button>
        ))}
      </div>
      <div className="flex justify-between mt-4">
        <Button variant="ghost" size="sm" onClick={() => {
          onDateChange(new Date());
          onClose?.();
        }}>
          Este mês
        </Button>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Fechar
        </Button>
      </div>
    </div>
  );
}

export { MonthYearPicker };