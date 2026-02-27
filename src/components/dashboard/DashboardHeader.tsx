import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, CalendarClock, Calendar, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

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
    <div className="space-y-6">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="h-6 w-1 bg-primary rounded-full" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Sistema de Gestão</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-serif text-foreground tracking-tight flex items-center gap-3">
            Olá, {userName?.split(" ")[0]} 
            <motion.div
              animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 4 }}
            >
              <Sparkles className="h-6 w-6 text-yellow-500 opacity-60" />
            </motion.div>
          </h1>
          <div className="flex items-center gap-2 text-muted-foreground/80">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-sm font-medium">{groupName}</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
          <div className="flex items-center bg-card border-2 border-primary/5 rounded-2xl p-1.5 shadow-xl shadow-primary/5 h-14">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-11 w-11 rounded-xl hover:bg-primary/10 hover:text-primary transition-all active:scale-90" 
              onClick={onPrevMonth}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <div className="px-6 text-base font-bold min-w-[160px] text-center capitalize text-primary flex flex-col justify-center">
              <span className="text-[10px] uppercase text-muted-foreground/60 leading-none mb-1 font-sans">Competência</span>
              {format(currentDate, "MMMM yyyy", { locale: ptBR })}
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-11 w-11 rounded-xl hover:bg-primary/10 hover:text-primary transition-all active:scale-90" 
              onClick={onNextMonth}
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          </div>
          
          <Button 
            className="relative h-14 gap-2 overflow-hidden px-8 rounded-2xl shadow-xl shadow-primary/20 transition-all hover:scale-[1.03] active:scale-[0.97] bg-primary hover:bg-primary/90 text-white font-bold" 
            asChild
          >
            <Link to="/expenses">
              <div
                className={cn(
                  "absolute inset-0 pointer-events-none rounded-[inherit] border-2 border-white/20"
                )}
              />
              {/* Efeito de brilho animado na borda */}
              <div className="absolute inset-0 pointer-events-none [mask-image:linear-gradient(white,white)]">
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ repeat: Infinity, duration: 2, ease: "linear", repeatDelay: 1 }}
                />
              </div>
              <Plus className="h-5 w-5 stroke-[3px]" /> 
              <span>Nova Despesa</span>
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 bg-primary/10 text-primary border border-primary/20 px-4 py-2 rounded-xl text-xs font-bold shadow-sm">
          <CalendarClock className="h-4 w-4" /> 
          Ciclo: {format(cycleStart, "dd/MM")} a {format(subDays(cycleEnd, 1), "dd/MM")}
        </div>
        <div className="flex items-center gap-2 bg-destructive/10 text-destructive border border-destructive/20 px-4 py-2 rounded-xl text-xs font-bold shadow-sm">
          <Calendar className="h-4 w-4" /> 
          Vencimento: {format(cycleLimitDate, "dd/MM")}
        </div>
      </div>
    </div>
  );
}