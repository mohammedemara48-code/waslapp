import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { getMyProfile, updateMyProfile } from "@/lib/social/server";
import { compressImage, initials } from "@/lib/utils";
import { enableBrowserNotifications } from "@/lib/pwa";
import { signOut } from "@/lib/auth/client";
import { AppShell } from "@/components/app-shell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function ProfilePage() {
  const queryClient = useQueryClient();
  const me = useQuery({ queryKey: ["me"], queryFn: () => getMyProfile() });
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [facebook, setFacebook] = useState("");

  useEffect(() => {
    if (!me.data) return;
    setUsername(me.data.username ?? "");
    setDisplayName(me.data.display_name ?? "");
    setPhone(me.data.phone ?? "");
    setBio(me.data.bio ?? "");
    setAvatar(me.data.avatar_url);
    try {
      setFacebook(window.localStorage.getItem("wasl-facebook") ?? "");
    } catch {
      setFacebook("");
    }
  }, [me.data]);

  async function onAvatar(file: File | undefined) {
    if (!file) return;
    try {
      const data = await compressImage(file, 480, 0.8);
      setAvatar(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذر رفع الصورة");
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await updateMyProfile({
        data: {
          username,
          displayName,
          phone,
          bio,
          avatarData: avatar && avatar.startsWith("data:") ? avatar : undefined,
        },
      });
      try {
        window.localStorage.setItem("wasl-facebook", facebook.trim());
      } catch {
        /* ignore */
      }
      toast.success("حُفظ الملف");
      void queryClient.invalidateQueries({ queryKey: ["me"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذر الحفظ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell active="me">
      <form className="mx-auto w-full max-w-xl space-y-6 px-5 py-8" onSubmit={(e) => void save(e)}>
        <div>
          <p className="text-sm text-accent">ملفك الظاهر للأصدقاء</p>
          <h1 className="mt-1 font-display text-3xl">حسابي</h1>
          {me.data?.wasl_no ? (
            <p className="mt-2 text-sm text-muted">رقم وصل: <span className="text-fg">{me.data.wasl_no}</span> — شاركه ليضيفك الأصدقاء</p>
          ) : null}
        </div>

        <div className="flex items-center gap-4">
          <Avatar className="size-20">
            {avatar ? <AvatarImage src={avatar} alt="" /> : null}
            <AvatarFallback className="text-lg">{initials(displayName || username)}</AvatarFallback>
          </Avatar>
          <label className="text-sm text-muted">
            <span className="mb-2 block">صورة الواجهة</span>
            <Input type="file" accept="image/*" onChange={(e) => void onAvatar(e.target.files?.[0])} />
          </label>
        </div>

        <label className="block space-y-1.5">
          <span className="text-xs text-muted">اسم المستخدم</span>
          <Input value={username} onChange={(e) => setUsername(e.target.value)} required minLength={3} maxLength={20} />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs text-muted">الاسم المستعار</span>
          <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} required minLength={2} maxLength={40} />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs text-muted">رقم للتواصل</span>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="اختياري" />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs text-muted">نبذة</span>
          <Textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={180} rows={3} />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs text-muted">رابط فيسبوك</span>
          <Input value={facebook} onChange={(e) => setFacebook(e.target.value)} placeholder="https://facebook.com/..." />
        </label>

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={busy}>
            {busy ? "جارٍ الحفظ…" : "حفظ الملف"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              void enableBrowserNotifications().then((ok) =>
                toast[ok ? "success" : "error"](ok ? "التنبيهات مفعّلة" : "لم يُسمح بالتنبيهات"),
              )
            }
          >
            تفعيل إشعارات الجهاز
          </Button>
          <Button type="button" variant="secondary" onClick={() => void signOut("/login")}>
            تبديل الحساب
          </Button>
          <Button type="button" variant="ghost" onClick={() => void signOut("/login")}>
            تسجيل الخروج
          </Button>
          <Button type="button" variant="ghost" asChild>
            <Link to="/tools">الألعاب والأدوات</Link>
          </Button>
        </div>
      </form>
    </AppShell>
  );
}
