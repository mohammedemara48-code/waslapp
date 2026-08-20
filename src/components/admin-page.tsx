import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  adminBroadcast,
  adminDeletePost,
  adminDeleteRoom,
  adminDeleteStory,
  adminDismissReport,
  adminListMembers,
  adminListRecentPosts,
  adminListRecentStories,
  adminListReports,
  adminListRooms,
  adminSetBadge,
  adminSetRole,
  getAdminOverview,
} from "@/lib/admin/server";
import { initials } from "@/lib/utils";
import { AppShell } from "@/components/app-shell";
import { NameBadge } from "@/components/name-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function AdminPage() {
  const queryClient = useQueryClient();
  const overview = useQuery({ queryKey: ["admin-overview"], queryFn: () => getAdminOverview() });
  const members = useQuery({ queryKey: ["admin-members"], queryFn: () => adminListMembers() });
  const rooms = useQuery({ queryKey: ["admin-rooms"], queryFn: () => adminListRooms() });
  const reports = useQuery({ queryKey: ["admin-reports"], queryFn: () => adminListReports() });
  const posts = useQuery({ queryKey: ["admin-posts"], queryFn: () => adminListRecentPosts() });
  const stories = useQuery({ queryKey: ["admin-stories"], queryFn: () => adminListRecentStories() });
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  async function setRole(userId: string, role: "member" | "banned" | "admin") {
    try {
      await adminSetRole({ data: { userId, role } });
      void queryClient.invalidateQueries({ queryKey: ["admin-members"] });
      toast.success("تم التحديث");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذر التعديل");
    }
  }

  return (
    <AppShell active="me">
      <div className="mx-auto w-full max-w-3xl space-y-8 px-5 py-8">
        <div>
          <p className="text-sm text-accent">صلاحيات صاحب التطبيق</p>
          <h1 className="mt-1 font-display text-3xl">الإدارة</h1>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {[
            ["مشتركون", overview.data?.users],
            ["متصلون", overview.data?.online],
            ["غرف", overview.data?.rooms],
            ["رسائل", overview.data?.messages],
            ["قصص اليوم", overview.data?.stories],
          ].map(([label, n]) => (
            <div key={String(label)} className="rounded-xl border border-border-strong bg-surface px-3 py-4 shadow-glow">
              <p className="text-xs text-subtle">{label}</p>
              <p className="mt-1 font-display text-2xl">{n ?? "—"}</p>
            </div>
          ))}
        </div>

        <section className="space-y-2">
          <h2 className="text-sm">البلاغات</h2>
          {(reports.data ?? []).length === 0 ? (
            <p className="text-sm text-muted">لا بلاغات حالياً.</p>
          ) : (
            (reports.data ?? []).map((r) => (
              <div key={r.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border px-3 py-2.5 text-sm">
                <div className="min-w-0 flex-1">
                  <p>
                    <span className="text-muted">{r.reporter_name}</span> أبلغ عن{" "}
                    <span>{r.target_name}</span>
                  </p>
                  <p className="text-xs text-subtle">{r.reason || "بدون سبب"}</p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    void adminDismissReport({ data: r.id })
                      .then(() => {
                        void queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
                        toast.success("أُغلق البلاغ");
                      })
                      .catch((err) => toast.error(err instanceof Error ? err.message : "تعذر"))
                  }
                >
                  تجاهل
                </Button>
                <Button size="sm" variant="secondary" onClick={() => void setRole(r.target_id, "banned")}>
                  حظر
                </Button>
              </div>
            ))
          )}
        </section>

        <section className="space-y-2">
          <h2 className="text-sm">آخر المنشورات</h2>
          {(posts.data ?? []).map((p) => (
            <div key={p.id} className="flex items-start gap-2 rounded-lg border border-border px-3 py-2 text-sm">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted">
                  {p.display_name} · {p.kind}
                </p>
                <p className="truncate">{p.body || "—"}</p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  void adminDeletePost({ data: p.id })
                    .then(() => {
                      void queryClient.invalidateQueries({ queryKey: ["admin-posts"] });
                      void queryClient.invalidateQueries({ queryKey: ["posts"] });
                      toast.success("حُذف المنشور");
                    })
                    .catch((err) => toast.error(err instanceof Error ? err.message : "تعذر الحذف"))
                }
              >
                حذف
              </Button>
            </div>
          ))}
        </section>

        <section className="space-y-2">
          <h2 className="text-sm">قصص نشطة</h2>
          {(stories.data ?? []).map((s) => (
            <div key={s.id} className="flex items-start gap-2 rounded-lg border border-border px-3 py-2 text-sm">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted">{s.display_name}</p>
                <p className="truncate">{s.body || "قصة وسائط"}</p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  void adminDeleteStory({ data: s.id })
                    .then(() => {
                      void queryClient.invalidateQueries({ queryKey: ["admin-stories"] });
                      void queryClient.invalidateQueries({ queryKey: ["stories"] });
                      toast.success("حُذفت القصة");
                    })
                    .catch((err) => toast.error(err instanceof Error ? err.message : "تعذر الحذف"))
                }
              >
                حذف
              </Button>
            </div>
          ))}
        </section>

        <section className="space-y-3">
          <h2 className="text-sm">إشعار لكل المشتركين</h2>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="العنوان" />
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder="النص" />
          <Button
            onClick={() =>
              void adminBroadcast({ data: { title, body } })
                .then((r) => {
                  toast.success(`أُرسل إلى ${r.count}`);
                  setTitle("");
                  setBody("");
                })
                .catch((err) => toast.error(err instanceof Error ? err.message : "تعذر الإرسال"))
            }
          >
            إرسال
          </Button>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm">المشتركون</h2>
          {(members.data ?? []).map((person) => (
            <div key={person.user_id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border px-3 py-2.5">
              <Avatar>
                {person.avatar_url ? <AvatarImage src={person.avatar_url} alt="" /> : null}
                <AvatarFallback>{initials(person.display_name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">
                  {person.display_name} <NameBadge badge={person.badge} role={person.role} points={person.points} />
                </p>
                <p className="truncate text-xs text-muted">
                  @{person.username ?? "بدون"} · {person.role}
                  {person.online ? " · متصل" : ""}
                </p>
              </div>
              {person.role !== "owner" ? (
                <div className="flex flex-wrap gap-1">
                  <Button size="sm" variant="secondary" onClick={() => void setRole(person.user_id, "admin")}>
                    مشرف
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => void setRole(person.user_id, "member")}>
                    عضو
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      void adminSetBadge({ data: { userId: person.user_id, badge: person.badge === "active" ? "" : "active" } })
                        .then(() => {
                          void queryClient.invalidateQueries({ queryKey: ["admin-members"] });
                          void queryClient.invalidateQueries({ queryKey: ["members"] });
                          toast.success("تم تحديث الشارة");
                        })
                        .catch((err) => toast.error(err instanceof Error ? err.message : "تعذر التعديل"))
                    }
                  >
                    نشط
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      void adminSetBadge({ data: { userId: person.user_id, badge: person.badge === "featured" ? "" : "featured" } })
                        .then(() => {
                          void queryClient.invalidateQueries({ queryKey: ["admin-members"] });
                          void queryClient.invalidateQueries({ queryKey: ["members"] });
                          toast.success("تم تحديث الشارة");
                        })
                        .catch((err) => toast.error(err instanceof Error ? err.message : "تعذر التعديل"))
                    }
                  >
                    مميز
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => void setRole(person.user_id, "banned")}>
                    حظر
                  </Button>
                </div>
              ) : (
                <span className="text-xs text-accent">المالك</span>
              )}
            </div>
          ))}
        </section>

        <section className="space-y-2">
          <h2 className="text-sm">الغرف العامة</h2>
          {(rooms.data ?? []).map((room) => (
            <div key={room.id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{room.name}</p>
                <p className="text-xs text-muted">{room.member_count} عضو · {room.slug}</p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  void adminDeleteRoom({ data: room.id })
                    .then(() => {
                      toast.success("حُذفت الغرفة");
                      void queryClient.invalidateQueries({ queryKey: ["admin-rooms"] });
                      void queryClient.invalidateQueries({ queryKey: ["rooms"] });
                    })
                    .catch((err) => toast.error(err instanceof Error ? err.message : "تعذر الحذف"))
                }
              >
                حذف
              </Button>
            </div>
          ))}
        </section>
      </div>
    </AppShell>
  );
}
