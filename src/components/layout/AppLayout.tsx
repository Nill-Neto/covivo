import { useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { NotificationBell } from "./NotificationBell";
import { UserMenu } from "./UserMenu";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { Button } from "@/components/ui/button";
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

  const Logo = () => (
    <Link to="/" className="flex items-center gap-2 text-xl font-bold tracking-tight">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-sidebar-primary/20">
        R
      </div>
      <span className="text-foreground font-sans">Republi-K</span>
    </Link>
  );

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      <div className="flex items-center h-16 shrink-0 px-6 border-b border-sidebar-border/50">
         <span className="text-lg font-bold tracking-tight text-sidebar-foreground">Republi-K</span>
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
      <header className="z-50 flex h-16 shrink-0 items-center justify-between border-b bg-background/95 px-4 md:px-8 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-6">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden shrink-0 h-10 w-10"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <MenuToggleIcon open={mobileMenuOpen} className="h-6 w-6" />
            <span className="sr-only">Menu</span>
          </Button>

          <Logo />

          {membership && (
            <div className="hidden lg:flex items-center gap-2 border-l pl-6 min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                Moradia
              </span>
              <span className="text-sm font-semibold truncate">{membership.group_name}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 md:gap-6 shrink-0">
          <div className="hidden md:flex items-center gap-2 border-r pr-6 mr-3">
            {convenienceItems.map((item) => {
              const isActive = location.pathname === item.to;
              return (
                <Link key={item.to} to={item.to}>
                  <motion.div
                    className={cn(
                      "flex items-center rounded-lg transition-all duration-200 h-9 px-3",
                      isActive
                        ? "bg-primary/5 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <item.icon size={16} />
                    {isActive && (
                      <span className="ml-2 text-xs font-bold whitespace-nowrap">
                        {item.label}
                      </span>
                    )}
                  </motion.div>
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
            <div 
              className="absolute inset-0 z-30 md:hidden bg-black/40 backdrop-blur-[2px]" 
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="absolute top-0 left-0 bottom-0 z-40 w-64 md:hidden bg-sidebar text-sidebar-foreground shadow-2xl overflow-y-auto animate-in slide-in-from-left duration-300">
              <SidebarContent />
            </div>
          </>
        )}

        <main className="flex-1 overflow-y-auto bg-background relative">
          {/* Subtle color depth background */}
          <div className="absolute top-0 left-0 right-0 h-[500px] bg-gradient-to-b from-blue-500/[0.03] to-transparent pointer-events-none -z-10" />
          
          <div className="p-4 md:p-10">
            <div className="max-w-7xl mx-auto w-full relative z-0">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function CollapsibleNavGroup({
  title,
  items,
  location,
  onItemClick,
}: {
  title: string;
  items: { to: string; icon: any; label: string }[];
  location: any;
  onItemClick?: () => void;
}) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="space-y-2">
      <div className="flex w-full items-center justify-between px-2">
        <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-sidebar-foreground/40">
          {title}
        </h4>
      </div>
      <div className="space-y-1">
        {items.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onItemClick}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all",
                isActive
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-sidebar-foreground/50 hover:bg-white/5 hover:text-sidebar-foreground"
              )}
            >
              <item.icon
                className={cn("h-4 w-4 shrink-0 transition-colors", isActive ? "text-sidebar-primary" : "text-sidebar-foreground/30 group-hover:text-sidebar-foreground")}
              />
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}