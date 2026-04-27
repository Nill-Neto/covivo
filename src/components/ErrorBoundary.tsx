import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    // This is a simple reset. For a real app, you might want to navigate home.
    window.location.assign(window.location.origin);
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
          <div className="max-w-md text-center">
            <h1 className="text-2xl font-bold text-destructive mb-2">Oops! Algo deu errado.</h1>
            <p className="text-muted-foreground mb-4">
              Nossa equipe foi notificada. Por favor, tente recarregar a página ou voltar mais tarde.
            </p>
            {import.meta.env.DEV && this.state.error && (
              <pre className="mb-4 text-left text-xs bg-muted p-2 rounded-md overflow-auto">
                {this.state.error.stack}
              </pre>
            )}
            <Button onClick={this.handleReset}>Recarregar Página</Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;