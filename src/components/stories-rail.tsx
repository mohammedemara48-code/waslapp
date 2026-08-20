import { Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { listStories } from "@/lib/live/server";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { initials } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function StoriesRail() {
  const user = useCurrentUser();
  const stories = useQuery({
    queryKey: ["stories"],
    queryFn: () => listStories(),
    refetchInterval: 12000,
  });
  const seen = new Set<string>();
  const people = (stories.data ?? []).filter((s) => {
    if (seen.has(s.user_id)) return false;
    seen.add(s.user_id);
    return true;
  });

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      <Link to="/stories" className="flex w-16 shrink-0 flex-col items-center gap-1.5">
        <span className="grid size-14 place-items-center rounded-full border border-dashed border-accent text-accent">
          <Plus className="size-5" />
        </span>
        <span className="w-full truncate text-center text-[11px] text-muted">أضف قصة</span>
      </Link>
      {people.map((s) => (
        <Link key={s.user_id} to="/stories" className="flex w-16 shrink-0 flex-col items-center gap-1.5">
          <span className="rounded-full bg-accent p-px">
            <Avatar className="size-14 border-2 border-bg">
              {s.avatar_url ? <AvatarImage src={s.avatar_url} alt="" /> : null}
              <AvatarFallback>{initials(s.display_name)}</AvatarFallback>
            </Avatar>
          </span>
          <span className="w-full truncate text-center text-[11px] text-muted">
            {s.user_id === user?.id ? "قصتك" : s.display_name}
          </span>
        </Link>
      ))}
    </div>
  );
}
