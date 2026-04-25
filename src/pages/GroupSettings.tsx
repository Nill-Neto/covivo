import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { Save, SlidersHorizontal, User, Mail, Phone, Shield, FileText, FileSpreadsheet, Upload, Check, MapPin, AlertTriangle, Trash2 } from "lucide-react";
import { CustomLoader } from "@/components/ui/custom-loader";
import { PageHero } from "@/components/layout/PageHero";
import { ScrollRevealGroup } from "@/components/ui/scroll-reveal";
import { formatCPF, isValidCPF } from "@/lib/cpf";

const tabTriggerClass = "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm text-foreground/60 text-xs font-semibold px-3 py-1.5 rounded-md transition-all";
const tabListClass = "w-full justify-start overflow-x-auto bg-muted/50 rounded-lg p-1 h-auto gap-1";

function AccountTab() {
  const { profile, membership, isAdmin, user, refreshProfile } = useAuth();
  const [name, setName] = useState(profile?.full_name ?? "");
  const [nickname, setNickname] = useState(profile?.nickname ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [cpf, setCpf] = useState("");
  const [cpfError, setCpfError] = useState("");
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [generatingCsv, setGeneratingCsv] = useState(false);

  const [isAccountDeleteOpen, setIsAccountDeleteOpen] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.full_name);
      setNickname(profile.nickname ?? "");
      setPhone(profile.phone ?? "");
    }
  }, [profile]);

  const updateProfile = useMutation({
    mutationFn: async () => {
      if (!user) return;

      const cleanedCpf = cpf.replace(/\D/g, "");
      if (cleanedCpf.length > 0 && cleanedCpf.length !== 11) {
        throw new Error("CPF deve ter 11 dígitos");
      }
      if (cleanedCpf.length === 11 && !isValidCPF(cleanedCpf)) {
        throw new Error("CPF inválido");
      }

      const { error: profileErr } = await supabase
        .from("profiles")
        .update({
          full_name: name.trim(),
          nickname: nickname.trim() || null,
          phone: phone.trim() || null,
        })
        .eq("id", user.id);
      if (profileErr) throw profileErr;
    },
    onSuccess: async () => {
      await refreshProfile();
      toast({ title: "Perfil atualizado!" });
    },
    onError: (err: any) => {
      if (err.message?.includes("CPF")) {
        setCpfError(err.message);
      } else {
        toast({ title: "Erro ao atualizar perfil", description: err.message, variant: "destructive" });
      }
    },
  });

  const generateReport = async (format: 'pdf' | 'csv') => {
    if (!membership) return;
    const setLoading = format === 'pdf' ? setGeneratingPdf : setGeneratingCsv;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-report", {
        body: { group_id: membership.group_id, format },
      });
      if (error) throw error;
      if (!data?.file) throw new Error("Dados do arquivo não recebidos");
      const byteCharacters = atob(data.file);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: data.contentType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `relatorio-${new Date().toISOString().slice(0, 10)}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: `Relatório ${format.toUpperCase()} gerado com sucesso!` });
    } catch (e: any) {
      console.error(e);
      toast({ title: "Erro ao gerar relatório", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = () => {
    toast({
      title: "Exclusão de conta",
      description: "Para garantir a segurança financeira dos grupos, solicite a exclusão pelo email suporte@covivo.app.",
      duration: 8000,
    });
    setIsAccountDeleteOpen(false);
  };

  const initials = (profile?.full_name || "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <ScrollRevealGroup preset="blur-slide" className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={profile?.avatar_url ?? undefined} />
              <AvatarFallback className="text-lg">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="font-serif">{profile?.full_name}</CardTitle>
              <CardDescription>{profile?.email}</CardDescription>
              {membership && (
                <Badge variant={isAdmin ? "default" : "secondary"} className="mt-1">
                  {isAdmin ? "Administrador" : "Integrante"} — {membership.group_name}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Separator />
          <div className="space-y-4">
            <div>
              <Label className="flex items-center gap-2"><User className="h-4 w-4" />Nome completo</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="flex items-center gap-2"><User className="h-4 w-4" />Apelido</Label>
              <Input value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="Como prefere ser chamado" className="mt-1" />
            </div>
            <div>
              <Label className="flex items-center gap-2"><Mail className="h-4 w-4" />Email</Label>
              <Input value={profile?.email ?? ""} disabled className="mt-1" />
              <p className="text-xs text-muted-foreground mt-1">O email não pode ser alterado (vinculado ao Google)</p>
            </div>
            <div>
              <Label className="flex items-center gap-2"><Phone className="h-4 w-4" />Telefone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-9999" className="mt-1" />
            </div>

            <Separator />

            <Button onClick={() => updateProfile.mutate()} disabled={updateProfile.isPending} className="w-full">
              {updateProfile.isPending ? <CustomLoader className="h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              {updateProfile.isPending ? "Salvando..." : "Salvar alterações"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />Relatórios Mensais
          </CardTitle>
          <CardDescription>Baixe o resumo financeiro da moradia</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-3">
          <Button variant="outline" onClick={() => generateReport('pdf')} disabled={generatingPdf || generatingCsv} className="flex-1">
            {generatingPdf ? <CustomLoader className="mr-2 h-4 w-4" /> : <FileText className="mr-2 h-4 w-4 text-destructive" />}
            {generatingPdf ? "Gerando PDF..." : "Baixar PDF"}
          </Button>
          <Button variant="outline" onClick={() => generateReport('csv')} disabled={generatingPdf || generatingCsv} className="flex-1">
            {generatingCsv ? <CustomLoader className="mr-2 h-4 w-4" /> : <FileSpreadsheet className="mr-2 h-4 w-4 text-primary" />}
            {generatingCsv ? "Gerando CSV..." : "Baixar CSV"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg flex items-center gap-2">
            <Shield className="h-5 w-5" />Segurança
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>Autenticação via Google OAuth 2.0</p>
          <p>Seus dados sensíveis (CPF) são protegidos por criptografia e validação server-side</p>
        </CardContent>
      </Card>

      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="font-serif text-lg flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" /> Zona de Perigo
          </CardTitle>
          <CardDescription>Ações irreversíveis para a sua conta.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-lg border border-destructive/20 bg-destructive/5 p-4">
            <div className="space-y-0.5">
              <h4 className="text-sm font-medium text-foreground">Excluir minha conta</h4>
              <p className="text-xs text-muted-foreground">
                Remover permanentemente sua conta e dados pessoais do Covivo.
              </p>
            </div>
            <AlertDialog open={isAccountDeleteOpen} onOpenChange={setIsAccountDeleteOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="shrink-0">
                  <Trash2 className="h-4 w-4 mr-2" /> Excluir Conta
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não poderá ser desfeita. Você perderá o acesso a todas as moradias que participa e seu histórico financeiro será anonimizado.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Entendi, solicitar exclusão
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </ScrollRevealGroup>
  );
}

function GroupTab() {
  const { user, membership, refreshMembership, setActiveGroupId } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: group, isLoading } = useQuery({
    queryKey: ["group", membership?.group_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("groups")
        .select("*")
        .eq("id", membership!.group_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!membership?.group_id,
  });

  const { data: myMembership } = useQuery({
    queryKey: ["my-membership", membership?.group_id, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_members")
        .select("id, participates_in_splits")
        .eq("group_id", membership!.group_id)
        .eq("user_id", user!.id)
        .eq("active", true)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!membership?.group_id && !!user?.id,
  });

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [splittingRule, setSplittingRule] = useState<string>("equal");
  const [closingDay, setClosingDay] = useState<string>("1");
  const [dueDay, setDueDay] = useState<string>("10");
  const [participatesInSplits, setParticipatesInSplits] = useState(true);
  const [modoGestao, setModoGestao] = useState("centralized");
  const [isModoGestaoModalOpen, setIsModoGestaoModalOpen] = useState(false);
  const [newModoGestao, setNewModoGestao] = useState("centralized");

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const avatarRef = useRef<HTMLInputElement>(null);

  const [street, setStreet] = useState("");
  const [streetNumber, setStreetNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [fetchingCep, setFetchingCep] = useState(false);

  const [isGroupDeleteOpen, setIsGroupDeleteOpen] = useState(false);
  const [confirmGroupName, setConfirmGroupName] = useState("");

  useEffect(() => {
    if (group) {
      setName(group.name);
      setDescription(group.description ?? "");
      setSplittingRule(group.splitting_rule);
      setClosingDay(String(group.closing_day || 1));
      setDueDay(String(group.due_day || 10));
      setStreet(group.street ?? "");
      setStreetNumber(group.street_number ?? "");
      setComplement(group.complement ?? "");
      setNeighborhood(group.neighborhood ?? "");
      setCity(group.city ?? "");
      setState(group.state ?? "");
      setZipCode(group.zip_code ?? "");
      setAvatarUrl((group as any).avatar_url ?? null);
      setModoGestao((group as any).modo_gestao || "centralized");
      setNewModoGestao((group as any).modo_gestao || "centralized");
    }
  }, [group]);

  useEffect(() => {
    if (myMembership) {
      setParticipatesInSplits(myMembership.participates_in_splits);
    }
  }, [myMembership]);

  const handleCepChange = useCallback(async (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    const formatted = cleaned.length > 5 ? `${cleaned.slice(0, 5)}-${cleaned.slice(5, 8)}` : cleaned;
    setZipCode(formatted);

    if (cleaned.length === 8) {
      setFetchingCep(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cleaned}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setStreet(data.logradouro || "");
          setNeighborhood(data.bairro || "");
          setCity(data.localidade || "");
          setState(data.uf || "");
        }
      } catch { /* ignore */ } finally {
        setFetchingCep(false);
      }
    }
  }, []);

  const handleRemoveAvatar = () => {
    setAvatarFile(null);
    setAvatarUrl(null);
  };

  const updateGroup = useMutation({
    mutationFn: async (payload: any) => {
      const { error } = await supabase
        .from("groups")
        .update(payload)
        .eq("id", membership!.group_id);
      if (error) throw error;

      if (myMembership) {
        const { error: memberError } = await supabase
          .from("group_members")
          .update({ participates_in_splits: participatesInSplits })
          .eq("id", myMembership.id);
        if (memberError) throw memberError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group"] });
      queryClient.invalidateQueries({ queryKey: ["my-membership"] });
      refreshMembership();
      setAvatarFile(null);
      toast({ title: "Salvo!", description: "Configurações atualizadas." });
    },
    onError: (err: any) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  const handleSave = async () => {
    let newAvatarUrl = avatarUrl;
    if (avatarFile) {
      const ext = avatarFile.name.split(".").pop() || "jpg";
      const path = `${user!.id}/group_${membership!.group_id}_avatar_${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("documents").upload(path, avatarFile, { upsert: true });
      if (!uploadError) {
        const { data } = supabase.storage.from("documents").getPublicUrl(path);
        newAvatarUrl = data.publicUrl;
      } else {
        console.error("Upload error:", uploadError);
        throw new Error("Falha ao enviar a imagem de perfil do grupo.");
      }
    }

    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      splitting_rule: splittingRule as any,
      closing_day: parseInt(closingDay),
      due_day: parseInt(dueDay),
      street: street.trim() || null,
      street_number: streetNumber.trim() || null,
      complement: complement.trim() || null,
      neighborhood: neighborhood.trim() || null,
      city: city.trim() || null,
      state: state.trim() || null,
      zip_code: zipCode.replace(/\D/g, "") || null,
      avatar_url: newAvatarUrl,
    };

    updateGroup.mutate(payload);
  };

  const handleChangeModoGestao = () => {
    updateGroup.mutate({ modo_gestao: newModoGestao });
    setIsModoGestaoModalOpen(false);
  };

  const deleteGroup = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("groups").delete().eq("id", membership!.group_id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Moradia excluída com sucesso." });
      setActiveGroupId("");
      refreshMembership();
      navigate("/dashboard", { replace: true });
    },
    onError: (err: any) => {
      toast({ title: "Erro ao excluir", description: err.message, variant: "destructive" });
    }
  });

  const handleDeleteGroup = () => {
    if (confirmGroupName !== name) {
      toast({ title: "Nome incorreto", description: "O nome digitado não confere com o nome da moradia.", variant: "destructive" });
      return;
    }
    deleteGroup.mutate();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <CustomLoader className="h-6 w-6 text-primary" />
      </div>
    );
  }

  const groupInitials = name.substring(0, 2).toUpperCase();

  return (
    <ScrollRevealGroup preset="blur-slide" className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Dados da moradia</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-start sm:items-center gap-4">
            <div className="relative group cursor-pointer shrink-0" onClick={() => avatarRef.current?.click()}>
              <Avatar className="h-16 w-16 border-2 border-border/50">
                <AvatarImage src={avatarFile ? URL.createObjectURL(avatarFile) : avatarUrl || ""} />
                <AvatarFallback className="text-lg bg-primary/10 text-primary font-semibold">
                  {groupInitials}
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Upload className="h-4 w-4 text-white" />
              </div>
            </div>
            <div className="space-y-1 flex-1">
              <Label>Foto da moradia</Label>
              <p className="text-xs text-muted-foreground">Clique na imagem para alterar</p>
              {(avatarUrl || avatarFile) && (
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  onClick={(e) => { e.stopPropagation(); handleRemoveAvatar(); }}
                  className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10 mt-1 -ml-2"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Remover foto
                </Button>
              )}
            </div>
            <input 
              type="file" 
              ref={avatarRef} 
              accept="image/*" 
              className="hidden" 
              onChange={(e) => setAvatarFile(e.target.files?.[0] || null)} 
            />
          </div>

          <div className="space-y-2">
            <Label>Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex: Moradia compartilhada próxima à USP" />
          </div>
          <div className="space-y-2">
            <Label>Regra de rateio</Label>
            <Select value={splittingRule} onValueChange={setSplittingRule}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="equal">Divisão igualitária</SelectItem>
                <SelectItem value="percentage">Por peso/percentual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Dia de Fechamento</Label>
              <Input type="number" min="1" max="31" value={closingDay} onChange={(e) => setClosingDay(e.target.value)} />
              <p className="text-[10px] text-muted-foreground">
                Lançamentos após este dia entram na competência do mês seguinte.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Dia de Vencimento</Label>
              <Input type="number" min="1" max="31" value={dueDay} onChange={(e) => setDueDay(e.target.value)} />
              <p className="text-[10px] text-muted-foreground font-medium">
                Data limite para pagamento será <strong>um dia antes</strong> (Dia {parseInt(dueDay) - 1 || 30}). 
                No dia {dueDay} já será considerado atraso.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Participar dos rateios</Label>
              <p className="text-xs text-muted-foreground">
                Desative se você apenas administra o grupo e não participa das despesas.
              </p>
            </div>
            <Switch checked={participatesInSplits} onCheckedChange={setParticipatesInSplits} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5" /> Modo de Gestão Financeira
          </CardTitle>
          <CardDescription>Define como as dívidas e pagamentos são calculados no grupo.</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup value={modoGestao} disabled className="space-y-3">
            <div>
              <RadioGroupItem value="centralized" id="centralized" className="peer sr-only" />
              <Label htmlFor="centralized" className="flex flex-col items-center h-full justify-center rounded-md border-2 border-muted bg-popover p-4 peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                  <h4 className="font-semibold text-sm">Tesoureiro Central</h4>
                  <p className="text-xs text-muted-foreground text-center mt-1">Ideal para grupos com um único responsável pelos pagamentos. O app calcula quanto cada um deve ao tesoureiro.</p>
              </Label>
            </div>
            <div>
                <RadioGroupItem value="p2p" id="p2p" className="peer sr-only" />
                <Label htmlFor="p2p" className="flex flex-col items-center h-full justify-center rounded-md border-2 border-muted bg-popover p-4 peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                    <h4 className="font-semibold text-sm">Responsabilidades Compartilhadas</h4>
                    <p className="text-xs text-muted-foreground text-center mt-1">Perfeito para quando vários membros pagam contas. O app calcula quem deve para quem.</p>
                </Label>
            </div>
          </RadioGroup>
          <AlertDialog open={isModoGestaoModalOpen} onOpenChange={setIsModoGestaoModalOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="w-full mt-4">Alterar Modo de Gestão</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Alterar Modo de Gestão</AlertDialogTitle>
                <AlertDialogDescription>
                  Mudar o modo de gestão pode impactar como as dívidas são exibidas. Esta ação não pode ser desfeita facilmente.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <RadioGroup value={newModoGestao} onValueChange={setNewModoGestao} className="py-4 space-y-2">
                <Label htmlFor="centralized_modal" className="flex items-center gap-3 p-3 border rounded-md cursor-pointer hover:bg-muted/50">
                  <RadioGroupItem value="centralized" id="centralized_modal" />
                  <span>Tesoureiro Central</span>
                </Label>
                <Label htmlFor="p2p_modal" className="flex items-center gap-3 p-3 border rounded-md cursor-pointer hover:bg-muted/50">
                  <RadioGroupItem value="p2p" id="p2p_modal" />
                  <span>Responsabilidades Compartilhadas (P2P)</span>
                </Label>
              </RadioGroup>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleChangeModoGestao} disabled={newModoGestao === modoGestao || updateGroup.isPending}>
                  {updateGroup.isPending ? <CustomLoader className="h-4 w-4" /> : "Confirmar e Alterar"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="h-5 w-5" /> Endereço
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>CEP</Label>
            <div className="relative">
              <Input value={zipCode} onChange={(e) => handleCepChange(e.target.value)} placeholder="00000-000" maxLength={9} />
              {fetchingCep && <CustomLoader className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-2">
              <Label>Rua</Label>
              <Input value={street} onChange={(e) => setStreet(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Número</Label>
              <Input value={streetNumber} onChange={(e) => setStreetNumber(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Complemento</Label>
              <Input value={complement} onChange={(e) => setComplement(e.target.value)} placeholder="Apto, Bloco..." />
            </div>
            <div className="space-y-2">
              <Label>Bairro</Label>
              <Input value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Cidade</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <Input value={state} onChange={(e) => setState(e.target.value)} maxLength={2} placeholder="SP" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={updateGroup.isPending} className="w-full">
        {updateGroup.isPending ? <CustomLoader className="h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}
        Salvar Alterações
      </Button>

      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="font-serif text-lg flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" /> Zona de Perigo
          </CardTitle>
          <CardDescription>Ações irreversíveis para esta moradia.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-lg border border-destructive/20 bg-destructive/5 p-4">
            <div className="space-y-0.5">
              <h4 className="text-sm font-medium text-foreground">Excluir Moradia</h4>
              <p className="text-xs text-muted-foreground">
                Apagar permanentemente a moradia, despesas, moradores e histórico.
              </p>
            </div>
            <AlertDialog open={isGroupDeleteOpen} onOpenChange={(open) => { setIsGroupDeleteOpen(open); if(!open) setConfirmGroupName(""); }}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="shrink-0">
                  <Trash2 className="h-4 w-4 mr-2" /> Excluir Moradia
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir a moradia absolutamente?</AlertDialogTitle>
                  <AlertDialogDescription className="space-y-3">
                    <p>
                      Esta ação <strong>não pode ser desfeita</strong>. Todos os lançamentos financeiros, pagamentos e regras serão permanentemente removidos.
                    </p>
                    <div className="space-y-2 pt-2">
                      <Label>Digite <strong>{name}</strong> para confirmar:</Label>
                      <Input 
                        value={confirmGroupName} 
                        onChange={(e) => setConfirmGroupName(e.target.value)} 
                        placeholder={name} 
                      />
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <Button
                    variant="destructive"
                    onClick={handleDeleteGroup}
                    disabled={confirmGroupName !== name || deleteGroup.isPending}
                  >
                    {deleteGroup.isPending ? <CustomLoader className="h-4 w-4 mr-2" /> : null}
                    Excluir Permanentemente
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </ScrollRevealGroup>
  );
}

export default function GroupSettings() {
  const { isAdmin } = useAuth();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState(() => {
    return location.state?.tab === "group" && isAdmin ? "group" : "account";
  });
  
  const [heroCompact, setHeroCompact] = useState(false);

  useEffect(() => {
    if (location.state?.tab) {
      if (location.state.tab === "group" && !isAdmin) {
        setActiveTab("account");
      } else {
        setActiveTab(location.state.tab);
      }
    }
  }, [location.state, isAdmin]);

  const tabItems = (
    <>
      <TabsTrigger value="account" className={tabTriggerClass}>
        <User className="h-3.5 w-3.5 mr-1.5" /> Conta
      </TabsTrigger>
      {isAdmin && (
        <TabsTrigger value="group" className={tabTriggerClass}>
          <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5" /> Grupo
        </TabsTrigger>
      )}
    </>
  );

  const compactTabsList = (
    <TabsList className={tabListClass}>{tabItems}</TabsList>
  );

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 animate-in fade-in duration-500">
      <PageHero
        title="Configurações"
        subtitle={isAdmin ? "Gerencie sua conta e o grupo." : "Gerencie sua conta."}
        tone="primary"
        icon={<SlidersHorizontal className="h-4 w-4" />}
        compactTabs={compactTabsList}
        onCompactChange={setHeroCompact}
      />

      <div className="space-y-4">
        {!heroCompact && (
          <TabsList className={tabListClass}>{tabItems}</TabsList>
        )}

        <TabsContent value="account" className="space-y-4 mt-4">
          <AccountTab />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="group" className="space-y-4 mt-4">
            <GroupTab />
          </TabsContent>
        )}
      </div>
    </Tabs>
  );
}
