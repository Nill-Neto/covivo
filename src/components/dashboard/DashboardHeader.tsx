import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, CalendarClock, Calendar, ChevronLeft, ChevronRight, Sparkles, TrendingUp } from "lucide-react";
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
    <div className="relative overflow-hidden rounded-3xl hero-gradient p-8 md:p-12 mb-10 shadow-xl shadow-slate-900/10 border border-white/5">
      {/* Decorative glass elements */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-slate-400/5 blur-[100px] rounded-full translate-y-1/2 -translate-x-1/2 pointer-events-none" />
      
      <div className="relative z-10 flex flex-col gap-10 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-4">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
             <Badge className="bg-white/10 text-white border-white/10 hover:bg-white/20 transition-colors backdrop-blur-sm px-3 py-1 font-bold text-[10px] tracking-widest">
               <TrendingUp className="h-3 w-3 mr-1.5" />
               GESTÃO ATIVA
             </Badge>
          </motion.div>
          
          <div className="space-y-1">
            <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight flex items-center gap-3">
              Olá, {userName?.split(" ")[0]} 
              <Sparkles className="h-6 w-6 text-blue-400/60" />
            </h1>
            <div className="flex items-center gap-3 py-1">
              <div className="h-0.5 w-10 bg-blue-500/50 rounded-full" />
              <p className="text-white/60 text-lg font-medium">
                {groupName}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-5 items-stretch sm:items-center">
          {/* Executive Month Selector */}
          <div className="flex items-center bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-1 shadow-2xl">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-11 w-11 text-white/50 hover:bg-white/10 hover:text-white transition-all rounded-xl" 
              onClick={onPrevMonth}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="px-8 text-sm font-bold min-w-[170px] text-center capitalize text-white tracking-wide">
              {format(currentDate, "MMMM yyyy", { locale: ptBR })}
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-11 w-11 text-white/50 hover:bg-white/10 hover:text-white transition-all rounded-xl" 
              onClick={onNextMonth}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
          
          <Button 
            className="h-14 gap-3 px-10 bg-white text-[#0f172a] hover:bg-white/90 font-bold rounded-2xl shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] border-none" 
            asChild
          >
            <Link to="/expenses">
              <Plus className="h-5 w-5" /> Lançar Despesa
            </Link>
          </Button>
        </div>
      </div>

      <div className="mt-12 flex flex-wrap gap-4">
        <div className="flex items-center gap-3 bg-white/5 backdrop-blur-md border border-white/5 px-5 py-2.5 rounded-2xl">
            <CalendarClock className="h-4 w-4 text-blue-400" /> 
            <div className="flex flex-col">
              <span className="text-[9px] text-white/40 font-bold uppercase tracking-tighter">Período do Ciclo</span>
              <strong className="text-xs text-white/90">{format(cycleStart, "dd/MM")} a {format(subDays(cycleEnd, 1), "dd/MM")}</strong>
            </div>
        </div>
        <div className="flex items-center gap-3 bg-destructive/10 backdrop-blur-md border border-destructive/10 px-5 py-2.5 rounded-2xl">
            <Calendar className="h-4 w-4 text-destructive-foreground/80" /> 
            <div className="flex flex-col">
              <span className="text-[9px] text-white/40 font-bold uppercase tracking-tighter">Data Limite</span>
              <strong className="text-xs text-white/90">{format(cycleLimitDate, "dd/MM")}</strong>
            </div>
        </div>
      </div>
    </div>
  );
}