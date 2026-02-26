import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, CalendarClock, Calendar, ChevronLeft, ChevronRight, LayoutDashboard } from "lucide-react";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface DashboardHeaderProps {
  userName: string | undefined;
  groupName: string | undefined;
  currentDate: Date;
  cycleStart: Date;
  cycleEnd: Date;
  cycleLimitDate: Date;
  onNextMonth: () => void;
  onPrevMonth: () => void;
}

export function DashboardHeader({
  userName,
  groupName,
  currentDate,
  cycleStart,
  cycleEnd,
  cycleLimitDate,
  onNextMonth,
  onPrevMonth,
}: DashboardHeaderProps) {
  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
             <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <LayoutDashboard className="h-5 w-5 md:h-6 md:w-6" />
             </div>
             <div>
               <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                  Olá, <span className="text-primary">{userName?.split(" ")[0]}</span>
               </h1>
               <p className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
                  {groupName} • Gestão Financeira
               </p>
             </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="flex items-center bg-card border shadow-sm rounded-lg p-1 h-11">
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-md hover:bg-muted" onClick={onPrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="px-4 text-sm font-semibold min-w-[140px] text-center capitalize text-foreground">
              {format(currentDate, "MMMM yyyy", { locale: ptBR })}
            </div>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-md hover:bg-muted" onClick={onNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          <Button className="h-11 shadow-sm font-medium px-6" asChild>
            <Link to="/expenses" className="flex items-center gap-2">
              <Plus className="h-4 w-4" /> Nova Despesa
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 p-4 bg-card border rounded-lg shadow-sm">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground pr-4 border-r border-border">
           <CalendarClock className="h-4 w-4 text-primary" />
           <span>Ciclo Atual</span>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-medium py-1.5 px-3 bg-blue-50/50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800">
              {format(cycleStart, "dd MMM")} — {format(subDays(cycleEnd, 1), "dd MMM")}
          </Badge>
          
          <span className="text-muted-foreground/40 text-sm hidden sm:inline">•</span>

          <Badge variant="outline" className="font-medium py-1.5 px-3 bg-amber-50/50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800">
              Vencimento: {format(cycleLimitDate, "dd MMM")}
          </Badge>
        </div>
      </div>
    </div>
  );
}
