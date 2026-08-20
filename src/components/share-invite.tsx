import { toast } from "sonner";
import { inviteUrl } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function ShareInvite({ waslNo }: { waslNo?: number | null }) {
  const url = inviteUrl(waslNo);
  if (!url) return null;
  return (
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
      دعوة صديق
    </Button>
  );
}
