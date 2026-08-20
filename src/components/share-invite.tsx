import { toast } from "sonner";
import { inviteUrl } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function ShareInvite({ waslNo }: { waslNo?: number | null }) {
  const url = inviteUrl(waslNo);
  if (!url || !waslNo) return null;
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(url)}`;
  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface p-4">
      <p className="text-sm text-muted">ادعُ أصدقاءك برقم وصل أو مسح الرمز</p>
      <p className="font-display text-2xl">رقم {waslNo}</p>
      <img src={qr} alt={`QR لرقم ${waslNo}`} className="mx-auto size-40 rounded-lg bg-bg p-2" width={180} height={180} />
      <p className="break-all text-center text-xs text-subtle">{url}</p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            const text = `انضم إليّ على وصل برقم ${waslNo}\n${url}`;
            if (navigator.share) {
              void navigator.share({ title: "وصل", text, url }).catch(() => {});
            } else {
              void navigator.clipboard.writeText(text).then(() => toast.success("تم نسخ رابط الدعوة"));
            }
          }}
        >
          مشاركة الدعوة
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => void navigator.clipboard.writeText(url).then(() => toast.success("نُسخ الرابط"))}
        >
          نسخ الرابط
        </Button>
      </div>
    </div>
  );
}
