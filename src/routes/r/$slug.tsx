import { createFileRoute } from "@tanstack/react-router";
import { RoomView } from "@/components/room-view";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useAuthReady } from "@/lib/use-auth-ready";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/r/$slug")({ component: RoomPage });

function RoomPage() {
  const { slug } = Route.useParams();
  const { user, isPending } = useAuthReady();
  if (isPending) {
    return (
      <div className="flex min-h-dvh bg-bg p-6">
        <Skeleton className="hidden w-72 lg:block" />
        <Skeleton className="ms-4 flex-1" />
      </div>
    );
  }
  if (!user) return <RedirectToSignIn />;
  return <RoomView key={slug} slug={slug} />;
}
