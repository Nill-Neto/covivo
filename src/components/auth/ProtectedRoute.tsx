import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { CustomLoader } from "@/components/ui/custom-loader";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <CustomLoader className="h-8 w-8 text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (profile && !profile.onboarding_completed) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
