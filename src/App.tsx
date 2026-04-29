import { lazy, Suspense, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { BackgroundPathsLayer } from "@/components/ui/background-paths";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ErrorBoundary from "@/components/ErrorBoundary";

import Login from "./pages/Login";
import { ROUTE_ALIASES } from "@/config/branding";
import { resolveCanonicalDomainRedirect } from "@/config/app";

import { CustomLoader } from "@/components/ui/custom-loader";

const Index = lazy(() => import("./pages/Index"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const AcceptInvite = lazy(() => import("./pages/AcceptInvite"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Members = lazy(() => import("./pages/Members"));
const Expenses = lazy(() => import("./pages/Expenses"));
const Payments = lazy(() => import("./pages/Payments"));
const RecurringExpenses = lazy(() => import("./pages/RecurringExpenses"));
const Invites = lazy(() => import("./pages/Invites"));
const GroupSettings = lazy(() => import("./pages/GroupSettings"));
const AuditLog = lazy(() => import("./pages/AuditLog"));
const Inventory = lazy(() => import("./pages/Inventory"));
const ShoppingLists = lazy(() => import("./pages/ShoppingLists"));
const Profile = lazy(() => import("./pages/Profile"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Bulletin = lazy(() => import("./pages/Bulletin"));
const HouseRules = lazy(() => import("./pages/HouseRules"));
const Polls = lazy(() => import("./pages/Polls"));
const NewGroup = lazy(() => import("./pages/NewGroup"));
const Admin = lazy(() => import("./pages/Admin"));
const SidebarDemoPage = lazy(() => import("./pages/SidebarDemoPage"));
const BackgroundPathsDemoPage = lazy(() => import("./pages/BackgroundPathsDemoPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});
const VISIBILITY_HIDDEN_AT_KEY = "navigation_diagnostics_hidden_at";
const LONG_PAUSE_THRESHOLD_MS = 30_000;
const PRODUCTION_DIAGNOSTICS_SAMPLE_RATE = 0.15;

type NavigationDiagnosticsEvent = {
  event: "pageshow" | "visibilitychange";
  path: string;
  userAgent: string;
  timestamp: number;
  visibilityState?: DocumentVisibilityState;
  persisted?: boolean;
  hiddenAt?: number;
  pauseMs?: number;
  longPause?: boolean;
};

const emitNavigationDiagnostics = (payload: NavigationDiagnosticsEvent) => {
  if (!import.meta.env.PROD) {
    console.info("[navigation-diagnostics]", payload);
  }

  try {
    const body = JSON.stringify(payload);
    const endpoint = "/api/diagnostics/navigation";

    if (navigator.sendBeacon) {
      navigator.sendBeacon(endpoint, body);
      return;
    }

    void fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {
      // no-op: diagnostics are always fire-and-forget
    });
  } catch {
    // no-op: diagnostics must never impact render flow
  }
};

const AppShell = () => {
  const { pathname } = useLocation();
  const showGlobalBackground = pathname !== "/background-paths-demo";

  useEffect(() => {
    const redirectTarget = resolveCanonicalDomainRedirect(
      `${window.location.pathname}${window.location.search}${window.location.hash}`,
    );
    if (!redirectTarget) return;
    window.location.replace(redirectTarget);
  }, []);

  useEffect(() => {
    const shouldSampleDiagnostics = () =>
      !import.meta.env.PROD || Math.random() < PRODUCTION_DIAGNOSTICS_SAMPLE_RATE;

    const emitBaseData = () => ({
      path: window.location.pathname,
      userAgent: navigator.userAgent,
      timestamp: Date.now(),
    });

    const onPageShow = (event: PageTransitionEvent) => {
      const hiddenAtRaw = window.sessionStorage.getItem(VISIBILITY_HIDDEN_AT_KEY);
      const hiddenAt = hiddenAtRaw ? Number(hiddenAtRaw) : undefined;
      const pauseMs = hiddenAt ? Date.now() - hiddenAt : undefined;
      const longPause = typeof pauseMs === "number" && pauseMs > LONG_PAUSE_THRESHOLD_MS;

      if (!event.persisted && !longPause) {
        return;
      }

      if (!shouldSampleDiagnostics()) {
        return;
      }

      emitNavigationDiagnostics({
        event: "pageshow",
        persisted: event.persisted,
        hiddenAt,
        pauseMs,
        longPause,
        ...emitBaseData(),
      });
    };

    const onVisibilityChange = () => {
      const now = Date.now();

      if (document.visibilityState === "hidden") {
        window.sessionStorage.setItem(VISIBILITY_HIDDEN_AT_KEY, String(now));
        return;
      }

      if (document.visibilityState !== "visible") {
        return;
      }

      const hiddenAtRaw = window.sessionStorage.getItem(VISIBILITY_HIDDEN_AT_KEY);
      const hiddenAt = hiddenAtRaw ? Number(hiddenAtRaw) : undefined;
      const pauseMs = hiddenAt ? now - hiddenAt : undefined;
      const longPause = typeof pauseMs === "number" && pauseMs > LONG_PAUSE_THRESHOLD_MS;

      if (!longPause) {
        return;
      }

      if (!shouldSampleDiagnostics()) {
        return;
      }

      emitNavigationDiagnostics({
        event: "visibilitychange",
        visibilityState: "visible",
        hiddenAt,
        pauseMs,
        longPause,
        ...emitBaseData(),
      });
    };

    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-white dark:bg-neutral-950">
      {showGlobalBackground && <BackgroundPathsLayer />}
      <div className="relative z-10">
        <ErrorBoundary>
          <Suspense
            fallback={
              <div className="flex min-h-screen items-center justify-center">
                <CustomLoader className="h-8 w-8 text-primary" />
              </div>
            }
          >
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/invite" element={<AcceptInvite />} />
              
              {/* Dev-only routes */}
              {import.meta.env.DEV && (
                <>
                  <Route path="/sidebar-demo" element={<SidebarDemoPage />} />
                  <Route path="/background-paths-demo" element={<BackgroundPathsDemoPage />} />
                </>
              )}

              {ROUTE_ALIASES.map((alias) => (
                <Route
                  key={alias.from}
                  path={alias.from}
                  element={<Navigate to={alias.to} replace />}
                />
              ))}

              {/* Authenticated routes */}
              <Route
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/dashboard" element={<Dashboard key="dashboard-general" />} />
                <Route path="/expenses" element={<Expenses />} />
                <Route path="/payments" element={<Payments />} />
                <Route path="/recurring" element={<RecurringExpenses />} />
                <Route path="/members" element={<Members />} />
                <Route path="/invites" element={<Invites />} />
                <Route path="/inventory" element={<Inventory />} />
                <Route path="/shopping" element={<ShoppingLists />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/settings" element={<GroupSettings />} />
                <Route path="/bulletin" element={<Bulletin />} />
                <Route path="/rules" element={<HouseRules />} />
                <Route path="/polls" element={<Polls />} />
                <Route path="/audit-log" element={<AuditLog />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/groups/new" element={<NewGroup />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </div>
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppShell />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;