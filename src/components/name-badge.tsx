import { Badge } from "@/components/ui/badge";
import { rankFromPoints, rankLabel } from "@/lib/points";

const EXTRA: Record<string, string> = {
  active: "نشط",
  featured: "مميز",
};

export function NameBadge({
  badge,
  role,
  points,
}: {
  badge?: string | null;
  role?: string | null;
  points?: number | null;
}) {
  const chips: { label: string; variant: "default" | "ok" | "muted" }[] = [];
  if (role === "owner") chips.push({ label: "المالك", variant: "default" });
  if (typeof points === "number") {
    chips.push({
      label: rankLabel(points),
      variant: rankFromPoints(points) === "legend" || rankFromPoints(points) === "expert" ? "default" : "ok",
    });
  }
  if (badge && EXTRA[badge] && EXTRA[badge] !== chips.at(-1)?.label) {
    chips.push({ label: EXTRA[badge]!, variant: badge === "featured" ? "default" : "ok" });
  }
  if (chips.length === 0) return null;
  return (
    <span className="inline-flex flex-wrap items-center gap-1 align-middle">
      {chips.map((c) => (
        <Badge key={c.label} variant={c.variant} className="align-middle">
          {c.label}
        </Badge>
      ))}
    </span>
  );
}
