import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface OnboardingShellProps {
  step: number;
  totalSteps: number;
  title: string;
  description: string;
  children: React.ReactNode;
}

export function OnboardingShell({ step, totalSteps, title, description, children }: OnboardingShellProps) {
  const progress = (step / totalSteps) * 100;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="space-y-3">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Etapa {step} de {totalSteps}</p>
            <Progress value={progress} className="h-1.5" />
          </div>
          <CardTitle className="font-serif text-2xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {children}
        </CardContent>
      </Card>
    </div>
  );
}
