import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { MessageCircle, Search, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { listFriends, openDirect, respondFriend, searchPeople, sendFriendRequest } from "@/lib/social/server";
import { listMembers } from "@/lib/live/server";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { initials } from "@/lib/utils";
import { AppShell } from "@/components/app-shell";
import { UserActions } from "@/components/user-actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function FriendsPage() {
  const navigate = useNavigate();
  const me = useCurrentUser();
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const list = useQuery({ queryKey: ["friends"], queryFn: () => listFriends() });
  const members = useQuery({ queryKey: ["members"], queryFn: () => listMembers(), refetchInterval: 8000 });
  const results = useQuery({
    queryKey: ["people", q],
    queryFn: () => searchPeople({ data: q }),
    enabled: q.trim().length >= 2,
  });

  async function add(userId: string) {
    try {
      await sendFriendRequest({ data: userId });
      toast.success("أُرسل طلب الصداقة");
      void queryClient.invalidateQueries({ queryKey: ["friends"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذر الإرسال");
    }
  }

  async function reply(id: number, accept: boolean) {
    try {
      await respondFriend({ data: { id, accept } });
      void queryClient.invalidateQueries({ queryKey: ["friends"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذر الرد");
    }
  }

  async function chat(userId: string) {
    try {
      const { slug } = await openDirect({ data: userId });
      await navigate({ to: "/r/$slug", params: { slug } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذر فتح المحادثة");
    }
  }

  return (
    <AppShell active="friends">
      <div className="mx-auto w-full max-w-2xl space-y-8 px-5 py-8">
        <div>
          <p className="text-sm text-accent">كل من سجّل في وصل</p>
          <h1 className="mt-1 font-display text-3xl">المشتركون</h1>
        </div>

        <label className="relative block">
          <Search className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-subtle" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="مثلاً nora أو أحمد"
            className="pr-10"
          />
        </label>

        {q.trim().length >= 2 ? (
          <section className="space-y-2">
            <h2 className="text-xs text-subtle">نتائج البحث</h2>
            {(results.data ?? []).length === 0 && !results.isPending ? (
              <p className="text-sm text-muted">لا أحد بهذا الاسم.</p>
            ) : null}
            {(results.data ?? []).map((person) => (
              <div key={person.user_id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5">
                <Avatar>
                  {person.avatar_url ? <AvatarImage src={person.avatar_url} alt="" /> : null}
                  <AvatarFallback>{initials(person.display_name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{person.display_name}</p>
                  <p className="truncate text-xs text-muted">@{person.username ?? "بدون"}</p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => void add(person.user_id)}>
                  <UserPlus className="size-4" />
                  إضافة
                </Button>
              </div>
            ))}
          </section>
        ) : null}

        {(list.data?.incoming.length ?? 0) > 0 ? (
          <section className="space-y-2">
            <h2 className="text-xs text-subtle">طلبات واردة</h2>
            {list.data?.incoming.map((item) => (
              <div key={item.id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5">
                <Avatar>
                  {item.peer.avatar_url ? <AvatarImage src={item.peer.avatar_url} alt="" /> : null}
                  <AvatarFallback>{initials(item.peer.display_name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{item.peer.display_name}</p>
                  <p className="text-xs text-muted">@{item.peer.username ?? "بدون"}</p>
                </div>
                <Button size="sm" onClick={() => void reply(item.id, true)}>
                  قبول
                </Button>
                <Button size="sm" variant="ghost" onClick={() => void reply(item.id, false)}>
                  رفض
                </Button>
              </div>
            ))}
          </section>
        ) : null}

        <section className="space-y-2">
          <h2 className="text-xs text-subtle">كل المشتركين ({members.data?.length ?? 0})</h2>
          {members.isPending ? <p className="text-sm text-muted">جارٍ التحميل…</p> : null}
          {!members.isPending && (members.data?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted">لا مشتركون ظاهرون بعد. ادعُ شخصاً للدخول.</p>
          ) : null}
          {(members.data ?? []).map((person) => (
            <div key={person.user_id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5">
              <span className="relative">
                <Avatar>
                  {person.avatar_url ? <AvatarImage src={person.avatar_url} alt="" /> : null}
                  <AvatarFallback>{initials(person.display_name)}</AvatarFallback>
                </Avatar>
                {person.online ? (
                  <span className="absolute bottom-0 left-0 size-2.5 rounded-full border-2 border-surface bg-ok" />
                ) : null}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{person.display_name}</p>
                <p className="truncate text-xs text-muted">
                  @{person.username ?? "بدون"}
                  {person.online ? " · متصل" : " · غير متصل"}
                </p>
              </div>
              <UserActions person={person}>
                <Button size="sm" variant="ghost">خيارات</Button>
              </UserActions>
              {person.user_id !== me?.id ? (
                <Button size="sm" variant="secondary" onClick={() => void add(person.user_id)}>
                  <UserPlus className="size-4" />
                  إضافة
                </Button>
              ) : (
                <span className="text-xs text-subtle">أنت</span>
              )}
            </div>
          ))}
        </section>

        <section className="space-y-2">
          <h2 className="text-xs text-subtle">قائمتك</h2>
          {(list.data?.friends.length ?? 0) === 0 ? (
            <p className="text-sm text-muted">لا أصدقاء بعد. ابحث باسم المستخدم وأرسل طلباً.</p>
          ) : null}
          {list.data?.friends.map((item) => (
            <div key={item.id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5">
              <Avatar>
                {item.peer.avatar_url ? <AvatarImage src={item.peer.avatar_url} alt="" /> : null}
                <AvatarFallback>{initials(item.peer.display_name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{item.peer.display_name}</p>
                <p className="truncate text-xs text-muted">
                  @{item.peer.username ?? "بدون"}
                  {item.peer.online ? " · متصل" : " · غير متصل"}
                </p>
              </div>
              <UserActions person={item.peer}>
                <Button size="sm" variant="ghost">خيارات</Button>
              </UserActions>
              <Button size="sm" variant="secondary" onClick={() => void chat(item.peer.user_id)}>
                <MessageCircle className="size-4" />
                محادثة
              </Button>
            </div>
          ))}
        </section>
      </div>
    </AppShell>
  );
}
