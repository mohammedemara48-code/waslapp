import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";
import { listDirects } from "@/lib/social/server";
import { AppShell } from "@/components/app-shell";
import { Skeleton } from "@/components/ui/skeleton";

export function MessagesPage() {
  const dms = useQuery({
    queryKey: ["dms"],
    queryFn: () => listDirects(),
    refetchInterval: 8000,
  });

  return (
    <AppShell active="messages">
      <div className="mx-auto w-full max-w-2xl px-5 py-8">
        <p className="text-sm text-accent">بينك وبين أصدقائك فقط</p>
        <h1 className="mt-1 font-display text-3xl">المحادثات الخاصة</h1>
        <p className="mt-3 max-w-lg text-sm text-muted">
          أضف صديقاً أولاً ثم اضغط محادثة. داخل الخاصة: رسائل، صور وملفات، وصوت أو فيديو.
        </p>
        <div className="mt-8 space-y-2">
          {dms.isPending ? (
            <>
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </>
          ) : null}
          {(dms.data ?? []).length === 0 && !dms.isPending ? (
            <Link
              to="/friends"
              className="flex items-center gap-3 rounded-xl border border-dashed border-border px-4 py-8 text-sm text-muted"
            >
              <MessageCircle className="size-5 text-accent" />
              لا محادثات بعد. اذهب إلى الأصدقاء وابدأ واحدة.
            </Link>
          ) : null}
          {(dms.data ?? []).map((room) => (
            <Link
              key={room.slug}
              to="/r/$slug"
              params={{ slug: room.slug }}
              className="flex items-start justify-between gap-3 rounded-lg border border-border px-4 py-3 hover:bg-elevated"
            >
              <span>
                <span className="block text-sm font-medium">{room.name}</span>
                <span className="mt-1 block text-xs text-muted">{room.last_body ?? "ابدأ الحديث"}</span>
              </span>
              {room.unread ? (
                <span className="min-w-5 rounded-full bg-danger px-1.5 text-center text-[11px] leading-5 text-white">
                  {room.unread > 9 ? "9+" : room.unread}
                </span>
              ) : null}
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
