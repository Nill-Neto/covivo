import { useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { NotificationBell } from "./NotificationBell";
import { UserMenu } from "./UserMenu";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MenuToggleIcon } from "@/components/ui/menu-toggle-icon";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  LayoutDashboard,
  Users,
  UserPlus,
  ScrollText,
  Receipt,
  CreditCard,
  RefreshCw,
  Package,
  ShoppingCart,
  MessageSquare,
  BookOpen,
  Vote,
  Wallet,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const mainNavGroups = [
  {
    title: "Moradia",
    items: [
      { to: "/", icon: LayoutDashboard, label: "Painel Geral" },
      { to: "/expenses", icon: Receipt, label: "Despesas" },
      { to: "/payments", icon: CreditCard, label: "Pagamentos" },
      { to: "/inventory", icon: Package, label: "Estoque" },
      { to: "/shopping", icon: ShoppingCart, label: "Compras" },
    ],
  },
  {
    title: "Minhas Finanças",
    items: [
      { to: "/personal/bills", icon: ScrollText, label: "Faturas" },
      { to: "/personal/cards", icon: Wallet, label: "Meus Cartões" },
    ],
  },
];

const convenienceItems = [
  { to: "/bulletin", icon: MessageSquare, label: "Mural" },
  { to: "/rules", icon: BookOpen, label: "Regras" },
  { to: "/polls", icon: Vote, label: "Votações" },
  { to: "/members", icon: Users, label: "Moradores" },
];

const adminGroup = {
  title: "Administração",
  items: [
    { to: "/recurring", icon: RefreshCw, label: "Recorrências" },
    { to: "/invites", icon: UserPlus, label: "Convites" },
    { to: "/audit-log", icon: ScrollText, label: "Histórico" },
  ],
};

export function AppLayout() {
  const { membership, isAdmin } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const sidebarGroups = isAdmin ? [...mainNavGroups, adminGroup] : mainNavGroups;

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      <div className="flex items-center h-16 shrink-0 px-6 border-b border-sidebar-border bg-sidebar-accent/20">
         <span className="text-xl font-black tracking-tighter text-sidebar-foreground">REPUBLI-K</span>
      </div>
      <div className="flex-1 overflow-y-auto py-6 px-4">
        <nav className="space-y-8">
          {sidebarGroups.map((group) => (
            <CollapsibleNavGroup 
              key={group.title} 
              title={group.title} 
              items={group.items} 
              location={location} 
              onItemClick={() => setMobileMenuOpen(false)}
            />
          ))}

          <div className="md:hidden">
            <CollapsibleNavGroup 
              title="Convivência" 
              items={convenienceItems} 
              location={location} 
              onItemClick={() => setMobileMenuOpen(false)}
            />
          </div>
        </nav>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      <header className="z-50 flex h-16 shrink-0 items-center justify-between border-b bg-background/95 px-4 md:px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden shrink-0 h-10 w-10"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <MenuToggleIcon open={mobileMenuOpen} className="h-6 w-6" />
          </Button>

          <Link to="/" className="flex items-center gap-2 font-serif text-xl font-bold tracking-tight">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              R
            </div>
            <span className="text-foreground font-black tracking-tighter hidden sm:block">REPUBLI-K</span>
          </Link>

          {membership && (
            <div className="hidden lg:flex items-center gap-2 border-l pl-4 ml-2">
              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-bold px-3 py-1">
                {membership.group_name}
              </Badge>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <div className="hidden md:flex items-center gap-1 bg-muted/40 p-1 rounded-full border">
            {convenienceItems.map((item) => {
              const isActive = location.pathname === item.to;
              return (
                <Link key={item.to} to={item.to}>
                  <div className={cn(
                    "flex items-center rounded-full transition-all duration-200 h-8 px-3 text-xs font-bold",
                    isActive ? "bg-white text-primary shadow-sm border" : "text-muted-foreground hover:text-foreground"
                  )}>
                    {item.label}
                  </div>
                </Link>
              );
            })}
          </div>
          <AnimatedThemeToggler />
          <NotificationBell />
          <UserMenu />
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        <aside className="hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex md:flex-col overflow-y-auto">
          <SidebarContent />
        </aside>

        {mobileMenuOpen && (
          <>
            <div className="absolute inset-0 z-30 md:hidden bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setMobileMenuOpen(false)} />
            <div className="absolute top-0 left-0 bottom-0 z-40 w-64 md:hidden bg-sidebar text-sidebar-foreground shadow-2xl overflow-y-auto animate-in slide-in-from-left duration-300">
              <SidebarContent />
            </div>
          </>
        )}

        <main className="flex-1 overflow-y-auto bg-background relative scroll-smooth">
          {/* Header Background Fill (The vibrant part) */}
          <div className="absolute top-0 left-0 right-0 h-72 bg-primary/10 -z-10" />
          <div className="absolute top-0 left-0 right-0 h-72 bg-gradient-to-b from-primary/15 via-primary/5 to-transparent -z-10" />
          
          <div className="p-4 md:p-8 lg:p-10 max-w-7xl mx-auto w-full relative z-0">
             <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

function CollapsibleNavGroup({ title, items, location, onItemClick }: any) {
  const [isOpen, setIsOpen] = useState(true);
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-2">
        <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-sidebar-foreground/40">{title}</h4>
        <button onClick={() => setIsOpen(!isOpen)} className="text-sidebar-foreground/30 hover:text-sidebar-foreground transition-colors">
          <ChevronDown className={cn("h-3 w-3 transition-transform", isOpen ? "rotate-0" : "-rotate-90")} />
        </button>
      </div>
      {isOpen && (
        <div className="space-y-1">
          {items.map((item: any) => {
            const isActive = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={onItemClick}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-all",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-[1.02]"
                    : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                )}
              >
                <item.icon className={cn("h-4 w-4 shrink-0", isActive ? "text-primary-foreground" : "text-sidebar-foreground/40 group-hover:text-sidebar-foreground")} />
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}