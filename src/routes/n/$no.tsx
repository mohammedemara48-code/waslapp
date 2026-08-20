import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { lookupWaslNo } from "@/lib/engage/server";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useAuthReady } from "@/lib/use-auth-ready";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/n/$no")({ component: InviteRoute });

function InviteRoute() {
  const { no } = Route.useParams();
  const navigate = useNavigate();
  const { user, isPending } = useAuthReady();
  useEffect(() => {
    if (!user) return;
    void lookupWaslNo({ data: no })
      .then(({ userId }) => navigate({ to: "/u/$userId", params: { userId } }))
      .catch(() => navigate({ to: "/friends" }));
  }, [user, no, navigate]);
  if (isPending) return <div className="min-h-dvh bg-bg p-6"><Skeleton className="h-40 w-full" /></div>;
  if (!user) return <RedirectToSignIn />;
  return <div className="min-h-dvh bg-bg p-8 text-muted">جارٍ فتح الحساب…</div>;
}
