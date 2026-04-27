import { useAuth } from "@/contexts/AuthContext";

export default function Admin() {
  const { isAdmin, membership } = useAuth();

  if (!membership) {
    return <div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  }
  if (!isAdmin) {
    return <div className="p-8 text-center text-foreground">Acesso restrito a administradores.</div>;
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-500 p-6">
      <h1 className="text-2xl font-bold">Página de Administração</h1>
      <p className="text-muted-foreground">A lógica de dados desta página está sendo reconstruída para corrigir um erro crítico.</p>
      <p>Esta é uma visualização temporária para confirmar que o problema principal foi isolado.</p>
    </div>
  );
}
