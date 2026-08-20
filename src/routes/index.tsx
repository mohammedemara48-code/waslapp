import { createFileRoute } from "@tanstack/react-router";
import { Landing } from "@/components/landing";
import { Lobby } from "@/components/lobby";
import { useAuthReady } from "@/lib/use-auth-ready";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const { user, isPending } = useAuthReady();
  if (isPending) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg">
        <div className="w-full max-w-md space-y-3 px-6">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    );
  }
  if (!user) return <Landing />;
  return <Lobby />;
}
