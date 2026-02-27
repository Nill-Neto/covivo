import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, CalendarClock, Calendar, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";

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
    <div className="space-y-6 mb-8">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
             <div className="h-1 w-6 bg-primary rounded-full" />
             <span className="text-[10px] font-black uppercase tracking-widest text-primary">Resumo da Moradia</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-foreground">
            Olá, {userName?.split(" ")[0]} 
            <motion.span 
              initial={{ rotate: 0 }}
              animate={{ rotate: [0, 15, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="inline-block ml-3"
            >
              👋
            </motion.span>
          </h1>
          <p className="text-muted-foreground mt-2 text-base font-medium flex items-center gap-2">
             <Badge variant="secondary" className="bg-primary/10 text-primary border-none hover:bg-primary/10">{groupName}</Badge>
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="flex items-center bg-white/80 dark:bg-card/80 backdrop-blur-md border shadow-sm rounded-2xl p-1 h-12">
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-primary/10 hover:text-primary transition-colors" onClick={onPrevMonth}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="px-4 text-sm font-black min-w-[160px] text-center capitalize text-foreground">
              {format(currentDate, "MMMM yyyy", { locale: ptBR })}
            </div>
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-primary/10 hover:text-primary transition-colors" onClick={onNextMonth}>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
          
          <Button className="h-12 rounded-2xl gap-2 px-8 shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all font-bold text-base" asChild>
            <Link to="/expenses">
              <Plus className="h-5 w-5 stroke-[3px]" /> 
              <span>Nova Despesa</span>
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 bg-white dark:bg-card px-4 py-2 rounded-xl border shadow-sm">
            <CalendarClock className="h-4 w-4 text-primary stroke-[2.5px]" /> 
            <span className="text-xs font-bold text-muted-foreground uppercase">Ciclo:</span>
            <span className="text-xs font-black">{format(cycleStart, "dd/MM")}</span>
            <span className="text-[10px] text-muted-foreground">→</span>
            <span className="text-xs font-black">{format(subDays(cycleEnd, 1), "dd/MM")}</span>
        </div>
        <div className="flex items-center gap-2 bg-destructive/5 text-destructive px-4 py-2 rounded-xl border border-destructive/20 shadow-sm">
            <Calendar className="h-4 w-4 stroke-[2.5px]" /> 
            <span className="text-xs font-bold uppercase">Pagar até:</span>
            <span className="text-xs font-black">{format(cycleLimitDate, "dd/MM")}</span>
        </div>
      </div>
    </div>
  );
}