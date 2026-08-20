import { createFileRoute, Navigate } from "@tanstack/react-router";
import { Landing } from "@/components/landing";
import { useAuthReady } from "@/lib/use-auth-ready";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const { user, isPending } = useAuthReady();
  if (isPending) {
    return <div className="min-h-dvh bg-bg" />;
  }
  if (user) return <Navigate to="/" />;
  return <Landing />;
}
