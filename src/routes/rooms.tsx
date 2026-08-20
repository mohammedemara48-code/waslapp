import { createFileRoute } from "@tanstack/react-router";
import { Lobby } from "@/components/lobby";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useAuthReady } from "@/lib/use-auth-ready";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/rooms")({ component: RoomsRoute });

function RoomsRoute() {
  const { user, isPending } = useAuthReady();
  if (isPending) return <div className="min-h-dvh bg-bg p-6"><Skeleton className="h-40 w-full" /></div>;
  if (!user) return <RedirectToSignIn />;
  return <Lobby />;
}
