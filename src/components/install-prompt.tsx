import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallPrompt({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [open, setOpen] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone) setInstalled(true);
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  async function install() {
    if (deferred) {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") setInstalled(true);
      setDeferred(null);
      return;
    }
    setOpen(true);
  }

  return (
    <>
      <Button variant={compact ? "ghost" : "secondary"} size={compact ? "icon" : "sm"} onClick={() => void install()}>
        <Download className="size-4" />
        {compact ? <span className="sr-only">{t.install}</span> : t.install_app}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.install_title}</DialogTitle>
            <DialogDescription>
              التطبيق جاهز للعمل كبرنامج مستقل من الشاشة الرئيسية، وهذا هو الطريق نفسه لاحقاً إلى متجر بلاي عبر غلاف الويب.
            </DialogDescription>
          </DialogHeader>
          <ol className="space-y-2 text-sm text-muted">
            <li>أندرويد: قائمة المتصفح ثم «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».</li>
            <li>آيفون: زر المشاركة ثم «إضافة إلى الشاشة الرئيسية».</li>
            <li>بعد التثبيت يفتح وصل بملء الشاشة دون شريط المتصفح.</li>
          </ol>
        </DialogContent>
      </Dialog>
    </>
  );
}
