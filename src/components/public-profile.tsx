import { useQuery } from "@tanstack/react-query";
import { getPublicProfile } from "@/lib/live/server";
import { initials } from "@/lib/utils";
import { AppShell } from "@/components/app-shell";
import { UserActions } from "@/components/user-actions";
import { NameBadge } from "@/components/name-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function PublicProfile({ userId }: { userId: string }) {
  const q = useQuery({
    queryKey: ["profile", userId],
    queryFn: () => getPublicProfile({ data: userId }),
  });
  if (q.isPending) {
    return (
      <AppShell active="friends">
        <div className="mx-auto max-w-xl p-6">
          <Skeleton className="h-40 w-full" />
        </div>
      </AppShell>
    );
  }
  if (q.error || !q.data) {
    return (
      <AppShell active="friends">
        <p className="p-8 text-muted">الحساب غير موجود</p>
      </AppShell>
    );
  }
  const { profile, mine, blocked } = q.data;
  return (
    <AppShell active="friends">
      <div className="mx-auto w-full max-w-xl space-y-6 px-5 py-10">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar className="size-20">
              {profile.avatar_url ? <AvatarImage src={profile.avatar_url} alt="" /> : null}
              <AvatarFallback className="text-lg">{initials(profile.display_name)}</AvatarFallback>
            </Avatar>
            {profile.online ? <span className="absolute bottom-1 left-1 size-3 rounded-full border-2 border-bg bg-ok" /> : null}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-3xl">
              {profile.display_name} <NameBadge badge={profile.badge} />
            </h1>
            <p className="text-sm text-muted">رقم {profile.wasl_no ?? "—"} · @{profile.username ?? "بدون"}</p>
            <p className="mt-1 text-xs text-subtle">{profile.online ? "متصل الآن" : "غير متصل"}</p>
          </div>
        </div>
        {profile.bio ? <p className="text-sm text-muted">{profile.bio}</p> : null}
        {profile.phone ? <p className="text-sm text-subtle">تواصل: {profile.phone}</p> : null}
        {mine ? (
          <p className="text-sm text-muted">هذا ملفك. عدّله من حسابي.</p>
        ) : blocked ? (
          <p className="text-sm text-danger">محظور</p>
        ) : (
          <UserActions person={profile}>
            <Button>خيارات</Button>
          </UserActions>
        )}
      </div>
    </AppShell>
  );
}
