import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { createRoom } from "@/lib/chat/server";
import { slugifyRoom } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export function CreateRoomDialog({ onCreated }: { onCreated?: () => void }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const room = await createRoom({ data: { name, description, slug: slugifyRoom() } });
      setOpen(false);
      setName("");
      setDescription("");
      onCreated?.();
      await navigate({ to: "/r/$slug", params: { slug: room.slug } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر إنشاء الغرفة");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" className="w-full">
          <Plus className="size-4" />
          غرفة جديدة
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>افتح غرفة</DialogTitle>
          <DialogDescription>اسم قصير يكفي. يمكن لأي مسجّل الدخول أن ينضم.</DialogDescription>
        </DialogHeader>
        <form className="space-y-3" onSubmit={(e) => void submit(e)}>
          <label className="block space-y-1.5">
            <span className="text-xs text-muted">الاسم</span>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثل: أمسية قراءة" maxLength={40} />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs text-muted">وصف اختياري</span>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="عمّ تتحدث هذه الغرفة؟"
              maxLength={160}
            />
          </label>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={busy || name.trim().length < 2}>
            {busy ? "جارٍ الإنشاء…" : "إنشاء والدخول"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
