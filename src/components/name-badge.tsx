import { Badge } from "@/components/ui/badge";

const LABELS: Record<string, string> = {
  active: "نشط",
  featured: "مميز",
  owner: "المالك",
};

export function NameBadge({ badge }: { badge?: string | null }) {
  if (!badge) return null;
  return (
    <Badge variant={badge === "featured" ? "default" : "ok"} className="align-middle">
      {LABELS[badge] ?? badge}
    </Badge>
  );
}
