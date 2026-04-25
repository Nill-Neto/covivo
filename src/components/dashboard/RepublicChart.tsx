export function RepublicChart({ data }) {
  if (!data || data.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">Sem dados para exibir.</p>;
  }
  return <div className="h-48 w-full bg-muted/50 rounded-md flex items-center justify-center"><p className="text-sm text-muted-foreground">[RepublicChart]</p></div>;
}