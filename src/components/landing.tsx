import { useState } from "react";
import { authClient, authEnabled } from "@/lib/auth/client";
import { claimLocalAccount } from "@/lib/social/server";
import { emailToPhone, phoneToEmail } from "@/lib/utils";
import { listSavedAccounts } from "@/lib/accounts";
import { BrandMark } from "@/components/brand-mark";
import { InstallPrompt } from "@/components/install-prompt";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";
import { siteOrigin } from "@/lib/site";

export function Landing() {
  const { t } = useI18n();
  const [tab, setTab] = useState<"in" | "up">("up");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [username, setUsername] = useState("");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const saved = listSavedAccounts();

  function openSaved(email: string) {
    const localPhone = emailToPhone(email);
    if (localPhone) {
      setTab("in");
      setPhone(localPhone);
      setError(t.enter_password);
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
            <LanguageSwitcher />
            <InstallPrompt compact />
          </div>
        </header>

        <section className="grid items-end gap-12 py-12 md:grid-cols-[1.15fr_0.85fr] md:gap-16">
          <div className="space-y-6">
            <p className="text-sm text-accent">{t.landing_kicker}</p>
            <h1 className="font-display text-4xl leading-[1.15] text-fg md:text-6xl">{t.seo_h1}</h1>
            <p className="max-w-md text-base text-muted">{t.landing_title}</p>
            <p className="max-w-md text-base text-muted">{t.landing_sub}</p>
            <ul className="max-w-md space-y-1 text-sm text-muted">
              <li>غرف دردشة عربية صوت وفيديو</li>
              <li>رسائل خاصة وقصص ومنشورات</li>
              <li>أضف أصدقاء برقم وصل وثبّت التطبيق على هاتفك</li>
            </ul>
          </div>

          <div className="rounded-xl border border-border bg-surface p-6">
            {!authEnabled ? (
              <p className="text-sm text-muted">تسجيل الدخول غير متاح حالياً.</p>
            ) : (
              <form className="space-y-3" onSubmit={(e) => void submitPhone(e)}>
                <div className="flex gap-2 text-sm">
                  <button
                    type="button"
                    className={tab === "up" ? "text-fg" : "text-muted"}
                    onClick={() => setTab("up")}
                  >
                    {t.new_account}
                  </button>
                  <span className="text-subtle">/</span>
                  <button
                    type="button"
                    className={tab === "in" ? "text-fg" : "text-muted"}
                    onClick={() => setTab("in")}
                  >
                    {t.signin}
                  </button>
                </div>
                <p className="text-xs leading-relaxed text-subtle">
                  يُنشأ الحساب برقم الجوال واسم المستخدم وكلمة السر، ويُحفظ الرقم في ملفك.
                </p>
                <label className="block space-y-1.5">
                  <span className="text-xs text-muted">{t.phone}</span>
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
                      <span className="text-xs text-muted">{t.username}</span>
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
                      <span className="text-xs text-muted">{t.nickname}</span>
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
                  <span className="text-xs text-muted">{t.password}</span>
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
                  {busy === "phone" ? t.saving : tab === "up" ? t.create_account : t.signin}
                </Button>
                {saved.length > 0 ? (
                  <div className="space-y-2 pt-2">
                    <p className="text-xs text-subtle">{t.saved_accounts}</p>
                    {saved.map((a) => (
                      <Button
                        key={a.email}
                        type="button"
                        variant="secondary"
                        className="w-full"
                        disabled={busy !== null}
                        onClick={() => openSaved(a.email)}
                      >
                        دخول كـ {a.label}
                      </Button>
                    ))}
                  </div>
                ) : null}
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
          <a href="/about" className="text-accent hover:underline">
            {t.about}
          </a>
          <a href="/privacy" className="text-accent hover:underline">
            {t.privacy}
          </a>
          <a href="/terms" className="text-accent hover:underline">
            {t.terms}
          </a>
        </footer>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "وصل",
              applicationCategory: "SocialNetworkingApplication",
              operatingSystem: "Web, Android, iOS",
              inLanguage: "ar",
              description: "تطبيق تواصل عربي: غرف، رسائل خاصة، صوت وفيديو، قصص ومنشورات.",
              url: `${siteOrigin()}/`,
              offers: { "@type": "Offer", price: "0", priceCurrency: "EGP" },
            }),
          }}
        />
      </div>
    </main>
  );
}
