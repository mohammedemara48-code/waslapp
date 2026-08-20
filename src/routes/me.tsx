import { createFileRoute } from "@tanstack/react-router";
import { ProfilePage } from "@/components/profile-page";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useAuthReady } from "@/lib/use-auth-ready";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/me")({ component: MeRoute });

function MeRoute() {
  const { user, isPending } = useAuthReady();
  if (isPending) return <div className="min-h-dvh bg-bg p-6"><Skeleton className="h-40 w-full" /></div>;
  if (!user) return <RedirectToSignIn />;
  return <ProfilePage />;
}
