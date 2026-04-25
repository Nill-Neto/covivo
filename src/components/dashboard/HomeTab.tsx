import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import { UserPlus, Home, Plus, Shield, ArrowRight, Check, Settings, MessageSquare, BookOpen, Vote } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function HomeTab() {
  const { memberships, activeGroupId, setActiveGroupId } = useAuth();
  const navigate = useNavigate();

  const { data: homeStats, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["home-stats", activeGroupId],
    queryFn: async () => {
      if (!activeGroupId) return null;

      const [postsRes, rulesRes, pollsRes] = await Promise.all([
        supabase.from("bulletin_posts")
          .select("title")
          .eq("group_id", activeGroupId)
          .order("pinned", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(1),
        supabase.from("house_rules")
          .select("id", { count: "exact" })
          .eq("group_id", activeGroupId)
          .eq("active", true),
        supabase.from("polls")
          .select("id", { count: "exact" })
          .eq("group_id", activeGroupId)
          .eq("status", "open")
      ]);

      const failedQueries = [
        { name: "bulletin_posts", error: postsRes.error },
        { name: "house_rules", error: rulesRes.error },
        { name: "polls", error: pollsRes.error },
      ].filter(({ error }) => error);

      if (failedQueries.length > 0) {
        const failureSummary = failedQueries
          .map(({ name, error: queryError }) => `${name}: ${queryError?.message ?? "unknown error"}`)
          .join(" | ");

        console.error("[HomeTab] home-stats query failed", {
          group_id: activeGroupId,
          failures: failedQueries.map(({ name, error: queryError }) => ({
            query: name,
            code: queryError?.code,
            message: queryError?.message,
            details: queryError?.details,
          })),
        });

        throw new Error(`Falha ao carregar estatísticas da casa (${failureSummary})`);
      }

      return {
        latestPost: postsRes.data?.[0]?.title || null,
        rulesCount: rulesRes.count || 0,
        openPollsCount: pollsRes.count || 0,
      };
    },
    enabled: !!activeGroupId,
  });

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid gap-4 md:grid-cols-2">
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
                const initials = m.group_name.substring(0, 2).toUpperCase();

                return (
                  <div
                    key={m.group_id}
                    onClick={() => setActiveGroupId(m.group_id)}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm",
                      isActive ? "bg-primary/5 border-primary/30" : "hover:bg-muted/50 hover:border-primary/30"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 shrink-0 border border-border/50">
                        <AvatarImage src={m.avatar_url || ""} />
                        <AvatarFallback className={cn("font-semibold", isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className={cn("text-sm font-medium truncate", isActive ? "text-foreground" : "text-muted-foreground")}>
                          {m.group_name}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize flex items-center gap-1">
                          {m.role === 'admin' ? <Shield className="h-3 w-3" /> : null} {m.role}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {isActive && <Check className="h-4 w-4 text-primary shrink-0" />}
                      {m.role === 'admin' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-primary z-10"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (m.group_id !== activeGroupId) {
                              setActiveGroupId(m.group_id);
                            }
                            navigate("/settings", { state: { tab: "group" } });
                          }}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col border-l-4 border-l-primary shadow-sm bg-card h-full justify-between">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Convidar Participantes
            </CardTitle>
            <CardDescription>
              Traga seus colegas para dividir despesas e organizar a casa no Covivo.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-end pb-6">
            <Button asChild className="w-full sm:w-auto gap-2">
              <Link to="/invites">
                Enviar convite <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Resumo Convivência */}
      <div className="pt-2">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-foreground/90">
          Convivência da Casa
        </h3>
        {isError ? (
          <Card className="border-destructive/40 bg-destructive/5">
            <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-destructive">Não foi possível carregar os dados da convivência.</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {error instanceof Error ? error.message : "Erro inesperado ao consultar o servidor."}
                </p>
              </div>
              <Button variant="outline" onClick={() => refetch()} className="w-full sm:w-auto">
                Tentar novamente
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            {/* Mural */}
            <Card className="hover:shadow-md transition-all cursor-pointer border-l-4 border-l-sky-500 bg-card" onClick={() => navigate('/bulletin')}>
              <CardContent className="p-4 flex flex-col h-full justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-semibold text-base">Mural</span>
                    <div className="bg-sky-500/10 p-2 rounded-md">
                      <MessageSquare className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                    </div>
                  </div>
                  {isLoading ? (
                    <div className="h-4 bg-muted animate-pulse rounded w-3/4 mt-2"></div>
                  ) : homeStats?.latestPost ? (
                    <p className="text-sm text-muted-foreground line-clamp-2 leading-snug">"{homeStats.latestPost}"</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhum aviso recente.</p>
                  )}
                </div>
                <p className="text-xs text-sky-600 dark:text-sky-400 font-medium mt-4 flex items-center">
                  Ver mural <ArrowRight className="h-3 w-3 ml-1" />
                </p>
              </CardContent>
            </Card>

            {/* Regras */}
            <Card className="hover:shadow-md transition-all cursor-pointer border-l-4 border-l-emerald-500 bg-card" onClick={() => navigate('/rules')}>
              <CardContent className="p-4 flex flex-col h-full justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-semibold text-base">Regras</span>
                    <div className="bg-emerald-500/10 p-2 rounded-md">
                      <BookOpen className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                  </div>
                  {isLoading ? (
                    <div className="h-4 bg-muted animate-pulse rounded w-1/2 mt-2"></div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      <strong className="text-foreground font-semibold">{homeStats?.rulesCount || 0}</strong> regras ativas na moradia.
                    </p>
                  )}
                </div>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-4 flex items-center">
                  Ler regras <ArrowRight className="h-3 w-3 ml-1" />
                </p>
              </CardContent>
            </Card>

            {/* Votações */}
            <Card className="hover:shadow-md transition-all cursor-pointer border-l-4 border-l-violet-500 bg-card" onClick={() => navigate('/polls')}>
              <CardContent className="p-4 flex flex-col h-full justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-semibold text-base">Votações</span>
                    <div className="bg-violet-500/10 p-2 rounded-md">
                      <Vote className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                    </div>
                  </div>
                  {isLoading ? (
                    <div className="h-4 bg-muted animate-pulse rounded w-1/2 mt-2"></div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      <strong className="text-foreground font-semibold">{homeStats?.openPollsCount || 0}</strong> votações em andamento.
                    </p>
                  )}
                </div>
                <p className="text-xs text-violet-600 dark:text-violet-400 font-medium mt-4 flex items-center">
                  Participar <ArrowRight className="h-3 w-3 ml-1" />
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
