import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import { UserPlus, Home, Plus, Shield, ArrowRight, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

export function HomeTab() {
  const { memberships, activeGroupId, setActiveGroupId } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid gap-4 md:grid-cols-2">
        {/* Card Convites */}
        <Card className="flex flex-col border-l-4 border-l-primary shadow-sm bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Convidar Participantes
            </CardTitle>
            <CardDescription>
              Traga seus colegas para dividir despesas e organizar a casa no Covivo.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex items-end">
            <Button asChild className="w-full sm:w-auto gap-2">
              <Link to="/invites">
                Enviar convite <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Card Grupos */}
        <Card className="flex flex-col shadow-sm bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-base">
              <div className="flex items-center gap-2">
                <Home className="h-5 w-5 text-foreground" />
                Meus Grupos
              </div>
              <Button size="sm" variant="ghost" asChild className="h-8 px-2 text-primary hover:bg-primary/10">
                <Link to="/groups/new"><Plus className="h-4 w-4 mr-1" /> Novo grupo</Link>
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-3">
            <div className="space-y-2 flex-1 max-h-[300px] overflow-y-auto pr-1">
              {memberships.map(m => {
                const isActive = m.group_id === activeGroupId;
                const initials = m.group_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

                return (
                  <div
                    key={m.group_id}
                    onClick={() => setActiveGroupId(m.group_id)}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors",
                      isActive ? "bg-primary/5 border-primary/30" : "hover:bg-muted/50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 border shrink-0">
                        <AvatarImage src={m.avatar_url || undefined} className="object-cover" />
                        <AvatarFallback className={cn("text-xs font-semibold", isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="min-w-0">
                        <p className={cn("text-sm font-medium truncate", isActive ? "text-foreground" : "text-muted-foreground")}>
                          {m.group_name}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize flex items-center gap-1 mt-0.5">
                          {m.role === 'admin' ? (
                            <Shield className={cn("h-3 w-3", isActive ? "text-primary/80" : "")} />
                          ) : (
                            <Home className={cn("h-3 w-3", isActive ? "text-primary/80" : "")} />
                          )}
                          {m.role}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveGroupId(m.group_id);
                          navigate("/settings");
                        }}
                        title="Configurações do grupo"
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}