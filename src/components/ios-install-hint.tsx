import { useEffect, useState } from "react";
import { Share, SquarePlus, X } from "lucide-react";
import { isIosNotInstalled } from "@/lib/pwa";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

const KEY = "wasl.iosHintDismissed";

export function IosInstallHint() {
  const { user } = useCurrentUserState();
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!user) return;
    try {
      if (localStorage.getItem(KEY)) return;
    } catch {
      /* ignore */
    }
    setShow(isIosNotInstalled());
  }, [user]);
  if (!show) return null;
  const close = () => {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* ignore */
    }
    setShow(false);
  };
  return (
    <div dir="rtl" className="fixed inset-x-3 bottom-3 z-50 rounded-2xl border border-white/10 bg-neutral-900/95 p-4 text-sm text-white shadow-2xl backdrop-blur">
      <button type="button" onClick={close} aria-label="إغلاق" className="absolute left-3 top-3 opacity-70">
        <X className="size-4" />
      </button>
      <p className="mb-2 font-semibold">ثبّت «وصل» على الآيفون عشان توصلك الإشعارات</p>
      <ol className="space-y-1.5 text-white/80">
        <li className="flex items-center gap-2">
          ١. اضغط زر المشاركة <Share className="size-4 shrink-0" /> تحت في Safari
        </li>
        <li className="flex items-center gap-2">
          ٢. اختار «إضافة إلى الشاشة الرئيسية» <SquarePlus className="size-4 shrink-0" />
        </li>
        <li>٣. افتح «وصل» من أيقونته وفعّل «تنبيهات الجهاز» من الجرس</li>
      </ol>
      <p className="mt-2 text-xs text-white/50">يتطلب iOS 16.4 أو أحدث.</p>
    </div>
  );
}
