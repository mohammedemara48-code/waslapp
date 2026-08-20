import { createFileRoute } from "@tanstack/react-router";
import { AdminPage } from "@/components/admin-page";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useAuthReady } from "@/lib/use-auth-ready";
import { useQuery } from "@tanstack/react-query";
import { getMyRole } from "@/lib/admin/server";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/admin")({ component: AdminRoute });

function AdminRoute() {
  const { user, isPending } = useAuthReady();
  const role = useQuery({
    queryKey: ["my-role"],
    queryFn: () => getMyRole(),
    enabled: Boolean(user),
  });
  if (isPending || (user && role.isPending)) {
    return (
      <div className="min-h-dvh bg-bg p-6">
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  if (!user) return <RedirectToSignIn />;
  if (role.data?.role !== "owner" && role.data?.role !== "admin") {
    return <p className="p-8 text-muted">هذه الصفحة لصاحب التطبيق فقط.</p>;
  }
  return <AdminPage />;
}
