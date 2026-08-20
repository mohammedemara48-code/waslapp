import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { inviteToCall, listFriends } from "@/lib/social/server";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

export function CallInviteBar({ slug, kind }: { slug: string; kind: "audio" | "video" }) {
  const { t } = useI18n();
  const friends = useQuery({ queryKey: ["friends"], queryFn: () => listFriends() });
  const list = friends.data?.friends ?? [];
  if (list.length === 0) return null;
  return (
    <div className="mt-3 rounded-lg border border-border bg-elevated p-3">
      <p className="mb-2 text-xs text-muted">{t.invite_to_call}</p>
      <div className="flex flex-wrap gap-1.5">
        {list.map((f) => (
          <Button
            key={f.id}
            size="sm"
            variant="secondary"
            onClick={() =>
              void inviteToCall({ data: { userId: f.peer.user_id, slug, kind } })
                .then(() => toast.success(t.invited))
                .catch((err) => toast.error(err instanceof Error ? err.message : t.invited))
            }
          >
            {t.invite} · {f.peer.display_name}
          </Button>
        ))}
      </div>
    </div>
  );
}
