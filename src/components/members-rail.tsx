import { useQuery } from "@tanstack/react-query";
import { listMembers } from "@/lib/live/server";
import { initials } from "@/lib/utils";
import { UserActions } from "@/components/user-actions";
import { NameBadge } from "@/components/name-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function MembersRail() {
  const members = useQuery({
    queryKey: ["members"],
    queryFn: () => listMembers(),
    refetchInterval: 10000,
  });
  const people = members.data ?? [];
  return (
    <section className="mt-4">
      <p className="mb-2 text-xs text-subtle">الأعضاء ({people.length})</p>
      <ul className="space-y-1">
        {people.map((person) => (
          <li key={person.user_id}>
            <UserActions person={person}>
              <button type="button" className="flex w-full min-h-11 items-center gap-2 rounded-md px-2 py-1.5 text-right hover:bg-elevated">
                <span className="relative">
                  <Avatar className="size-8">
                    {person.avatar_url ? <AvatarImage src={person.avatar_url} alt="" /> : null}
                    <AvatarFallback>{initials(person.display_name)}</AvatarFallback>
                  </Avatar>
                  {person.online ? (
                    <span className="absolute bottom-0 left-0 size-2 rounded-full border border-surface bg-ok" />
                  ) : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">
                    {person.display_name} <NameBadge badge={person.badge} role={person.role} points={person.points} />
                  </span>
                  <span className="block truncate text-[11px] text-muted">
                    رقم {person.wasl_no ?? "—"} · @{person.username ?? "بدون"}
                    {person.online ? " · متصل" : ""}
                  </span>
                </span>
              </button>
            </UserActions>
          </li>
        ))}
      </ul>
      {people.length === 0 && !members.isPending ? (
        <p className="text-xs text-muted">لا أعضاء بعد. ادعُ شخصاً للتسجيل.</p>
      ) : null}
    </section>
  );
}
