import { useState } from "react";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";
import { claimLocalAccount } from "@/lib/social/server";
import { phoneToEmail } from "@/lib/utils";
import { listSavedAccounts } from "@/lib/accounts";
import { BrandMark } from "@/components/brand-mark";
import { InstallPrompt } from "@/components/install-prompt";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path
        fill="currentColor"
        d="M21.6 12.23c0-.74-.07-1.45-.19-2.13H12v4.03h5.38a4.6 4.6 0 0 1-2 3.02v2.5h3.24c1.9-1.75 2.98-4.33 2.98-7.42Z"
      />
      <path
        fill="currentColor"
        d="M12 22c2.7 0 4.96-.9 6.62-2.35l-3.24-2.5c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.76-5.59-4.12H3.07v2.58A10 10 0 0 0 12 22Z"
        opacity=".85"
      />
      <path
        fill="currentColor"
        d="M6.41 13.99A6 6 0 0 1 6.1 12c0-.69.12-1.36.31-1.99V7.43H3.07A10 10 0 0 0 2 12c1.61 0 3.14.39 4.57 1.07l3.34-2.58Z"
        opacity=".7"
      />
      <path
        fill="currentColor"
        d="M12 5.96c1.47 0 2.79.5 3.82 1.5l2.86-2.86C16.95 2.97 14.7 2 12 2A10 10 0 0 0 3.07 7.43l3.34 2.58C7.2 7.72 9.4 5.96 12 5.96Z"
        opacity=".55"
      />
    </svg>
  );
}

export function Landing() {
  const [mode, setMode] = useState<"google" | "phone">("google");
  const [tab, setTab] = useState<"in" | "up">("up");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [username, setUsername] = useState("");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const google = GROK_PROVIDERS.find((p) => p.idp === "google");
  const others = GROK_PROVIDERS.filter((p) => p.idp !== "google");
  const saved = listSavedAccounts();

  async function start(providerId: string) {
    setError(null);
    setBusy(providerId);
    try {
      await signIn(providerId, { callbackURL: "/", errorCallbackURL: "/login" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر تسجيل الدخول");
      setBusy(null);
    }
  }

  async function submitPhone(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy("phone");
    try {
      const email = phoneToEmail(phone);
      if (tab === "up") {
        const { error: signError } = await authClient.signUp.email({
          email,
          password,
          name: nickname.trim() || username.trim(),
        });
        if (signError) throw new Error(signError.message ?? "تعذر إنشاء الحساب");
        await claimLocalAccount({
          data: { username, phone, displayName: nickname.trim() || username },
        });
      } else {
        const { error: signError } = await authClient.signIn.email({ email, password });
        if (signError) throw new Error(signError.message ?? "بيانات الدخول غير صحيحة");
      }
      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر إتمام العملية");
      setBusy(null);
    }
  }

  return (
    <main className="relative min-h-dvh overflow-hidden bg-bg text-fg">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            "radial-gradient(circle at 80% 20%, color-mix(in oklab, var(--color-accent) 10%, transparent), transparent 36%), linear-gradient(180deg, transparent, var(--color-bg))",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -left-16 size-[28rem] rounded-full border border-border"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-8 left-12 size-[20rem] rounded-full border border-border"
      />

      <div className="relative mx-auto flex min-h-dvh w-full max-w-5xl flex-col justify-between px-6 py-8 md:px-10">
        <header className="flex items-center justify-between gap-3">
          <BrandMark />
          <div className="flex items-center gap-2">
            <p className="hidden text-xs tracking-wide text-subtle sm:block">غرفة خاصة للصوت والصورة والكلمة</p>
            <InstallPrompt compact />
          </div>
        </header>

        <section className="grid items-end gap-12 py-12 md:grid-cols-[1.15fr_0.85fr] md:gap-16">
          <div className="space-y-6">
            <p className="text-sm text-accent">تواصل مباشر، بلا ضجيج</p>
            <h1 className="font-display text-4xl leading-[1.15] text-fg md:text-6xl">
              غرف هادئة
              <br />
              لصوت أوضح
            </h1>
            <p className="max-w-md text-base text-muted">
              ادخل بجوجل أو برقم جوالك، أضف أصدقاء، انشر قصة، وأرسل هدية داخل غرفة هادئة.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-surface p-6">
            <div className="mb-4 grid grid-cols-2 gap-1 rounded-lg bg-elevated p-1">
              <button
                type="button"
                className={`h-9 rounded-md text-sm ${mode === "google" ? "bg-surface text-fg" : "text-muted"}`}
                onClick={() => setMode("google")}
              >
                جوجل
              </button>
              <button
                type="button"
                className={`h-9 rounded-md text-sm ${mode === "phone" ? "bg-surface text-fg" : "text-muted"}`}
                onClick={() => setMode("phone")}
              >
                رقم الجوال
              </button>
            </div>

            {mode === "google" ? (
              <>
                <h2 className="mb-1 text-base font-medium">ابدأ من هنا</h2>
                <p className="mb-5 text-sm text-muted">أسرع دخول عبر حساب جوجل.</p>
                {authEnabled && google ? (
                  <Button
                    className="w-full"
                    size="lg"
                    disabled={busy !== null}
                    onClick={() => void start(google.providerId)}
                  >
                    <GoogleMark />
                    {busy === google.providerId ? "جارٍ الفتح…" : "المتابعة عبر جوجل"}
                  </Button>
                ) : (
                  <p className="text-sm text-muted">تسجيل الدخول غير متاح حالياً.</p>
                )}
                {authEnabled && others.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    {others.map((p) => (
                      <Button
                        key={p.providerId}
                        variant="ghost"
                        className="w-full"
                        disabled={busy !== null}
                        onClick={() => void start(p.providerId)}
                      >
                        أو عبر {p.label}
                      </Button>
                    ))}
                  </div>
                ) : null}
                {saved.length > 0 ? (
                  <div className="mt-4 space-y-2">
                    <p className="text-xs text-subtle">حسابات محفوظة على هذا الجهاز</p>
                    {saved.map((a) => (
                      <Button
                        key={a.email}
                        variant="secondary"
                        className="w-full"
                        disabled={busy !== null}
                        onClick={() => void start(google?.providerId ?? others[0]!.providerId)}
                      >
                        دخول كـ {a.label}
                      </Button>
                    ))}
                  </div>
                ) : null}
                <p className="mt-4 text-xs leading-relaxed text-subtle">
                  الدخول عبر جوجل أو X أو رقم الجوال. اربط فيسبوك من حسابي كرابط على ملفك.
                </p>
              </>
            ) : (
              <form className="space-y-3" onSubmit={(e) => void submitPhone(e)}>
                <div className="flex gap-2 text-sm">
                  <button
                    type="button"
                    className={tab === "up" ? "text-fg" : "text-muted"}
                    onClick={() => setTab("up")}
                  >
                    حساب جديد
                  </button>
                  <span className="text-subtle">/</span>
                  <button
                    type="button"
                    className={tab === "in" ? "text-fg" : "text-muted"}
                    onClick={() => setTab("in")}
                  >
                    دخول
                  </button>
                </div>
                <p className="text-xs leading-relaxed text-subtle">
                  إرسال رمز SMS غير متاح على هذه المنصة. يُنشأ الحساب مباشرة برقم الجوال واسم المستخدم وكلمة السر، ويُحفظ الرقم في ملفك.
                </p>
                <label className="block space-y-1.5">
                  <span className="text-xs text-muted">رقم الجوال</span>
                  <Input
                    inputMode="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="05xxxxxxxx"
                    required
                  />
                </label>
                {tab === "up" ? (
                  <>
                    <label className="block space-y-1.5">
                      <span className="text-xs text-muted">اسم المستخدم</span>
                      <Input
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="مثلاً nora"
                        required
                        minLength={3}
                        maxLength={20}
                      />
                    </label>
                    <label className="block space-y-1.5">
                      <span className="text-xs text-muted">الاسم المستعار</span>
                      <Input
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        placeholder="كما يظهر للأصدقاء"
                        maxLength={40}
                      />
                    </label>
                  </>
                ) : null}
                <label className="block space-y-1.5">
                  <span className="text-xs text-muted">كلمة السر</span>
                  <Input
                    type="password"
                    autoComplete={tab === "up" ? "new-password" : "current-password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                </label>
                <Button type="submit" className="w-full" disabled={busy !== null}>
                  {busy === "phone" ? "جارٍ الحفظ…" : tab === "up" ? "إنشاء الحساب" : "دخول"}
                </Button>
              </form>
            )}
            {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
          </div>
        </section>

        <footer className="grid gap-3 border-t border-border pt-6 text-xs text-subtle md:grid-cols-4">
          <span>غرف عامة وخاصة</span>
          <span>أصدقاء باسم المستخدم</span>
          <span>صوت وفيديو ومرفقات</span>
          <span>قابل للتثبيت على الجهاز</span>
        </footer>
      </div>
    </main>
  );
}
