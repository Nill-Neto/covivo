import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { UserPlus, Home, Plus, Shield, ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function HomeTab() {
  const { memberships, activeGroupId, setActiveGroupId } = useAuth();

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid gap-4 md:grid-cols-2">
        {/* Card Convites */}
        <Card className="flex flex-col border-l-4 border-l-primary shadow-sm bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Convidar Moradores
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
                Minhas Moradias
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
                      <div className={cn(
                        "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                        isActive ? "bg-primary/10" : "bg-muted"
                      )}>
                        {m.role === 'admin' ? (
                          <Shield className={cn("h-4 w-4", isActive ? "text-primary" : "text-muted-foreground")} />
                        ) : (
                          <Home className={cn("h-4 w-4", isActive ? "text-primary" : "text-muted-foreground")} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className={cn("text-sm font-medium truncate", isActive ? "text-foreground" : "text-muted-foreground")}>
                          {m.group_name}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">{m.role}</p>
                      </div>
                    </div>
                    {isActive && <Check className="h-4 w-4 text-primary shrink-0" />}
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