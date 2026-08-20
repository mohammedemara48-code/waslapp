import { useQuery } from "@tanstack/react-query";
import { listSavedMessages } from "@/lib/engage/server";
import { formatClock, formatDay, initials } from "@/lib/utils";
import { AppShell } from "@/components/app-shell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function SavedPage() {
  const q = useQuery({ queryKey: ["saved"], queryFn: () => listSavedMessages() });
  return (
    <AppShell active="me">
      <div className="mx-auto w-full max-w-xl space-y-4 px-5 py-8">
        <h1 className="font-display text-3xl">الرسائل المحفوظة</h1>
        {(q.data ?? []).length === 0 && !q.isPending ? (
          <p className="text-sm text-muted">نجّم رسالة داخل محادثة لتظهر هنا.</p>
        ) : null}
        {(q.data ?? []).map((m) => (
          <article key={m.id} className="rounded-lg border border-border px-3 py-3">
            <div className="mb-1 flex items-center gap-2 text-xs text-muted">
              <Avatar className="size-6">
                {m.avatar_url ? <AvatarImage src={m.avatar_url} alt="" /> : null}
                <AvatarFallback>{initials(m.display_name)}</AvatarFallback>
              </Avatar>
              {m.display_name} · {formatDay(m.created_at)} {formatClock(m.created_at)}
            </div>
            <p className="text-sm">{m.body || m.attachment_name || "مرفق"}</p>
          </article>
        ))}
      </div>
    </AppShell>
  );
}
