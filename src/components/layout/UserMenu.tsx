import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Settings, LogOut, User, MoreVertical } from "lucide-react";

export function UserMenu() {
  const { profile, signOut } = useAuth();

  const initials = (profile?.full_name || "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-2 hover:bg-muted cursor-pointer transition-colors group max-w-[200px] sm:max-w-[240px]">
          <Avatar className="h-8 w-8 border group-hover:border-primary/50 transition-colors shrink-0">
            <AvatarImage src={profile?.avatar_url} />
            <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 overflow-hidden hidden sm:block">
            <p className="truncate text-xs font-medium group-hover:text-primary transition-colors">
              {profile?.full_name}
            </p>
            <p className="truncate text-[10px] text-muted-foreground">{profile?.email}</p>
          </div>
          <MoreVertical className="h-3 w-3 text-muted-foreground group-hover:text-foreground shrink-0" />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56" sideOffset={10}>
        <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/profile" className="cursor-pointer">
            <User className="mr-2 h-4 w-4" />
            Meu Perfil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/settings" className="cursor-pointer">
            <Settings className="mr-2 h-4 w-4" />
            Configurações
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive cursor-pointer">
          <LogOut className="mr-2 h-4 w-4" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}