export function P2PBalances({ balances }) {
  if (!balances || balances.length === 0) {
    return null;
  }
  return <div className="h-24 w-full bg-muted/50 rounded-md flex items-center justify-center"><p className="text-sm text-muted-foreground">[P2PBalances]</p></div>;
}