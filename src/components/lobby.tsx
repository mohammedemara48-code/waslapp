import { useQuery } from "@tanstack/react-query";
import { listRooms } from "@/lib/chat/server";
import { listOnline } from "@/lib/live/server";
import { initials } from "@/lib/utils";
import { AppShell } from "@/components/app-shell";
import { RoomList } from "@/components/room-list";
import { StoriesRail } from "@/components/stories-rail";
import { UserActions } from "@/components/user-actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

export function Lobby() {
  const rooms = useQuery({
    queryKey: ["rooms"],
    queryFn: () => listRooms(),
    refetchInterval: 8000,
  });
  const online = useQuery({
    queryKey: ["online"],
    queryFn: () => listOnline(),
    refetchInterval: 8000,
  });

  return (
    <AppShell
      active="rooms"
      sidebar={
        rooms.isPending ? (
          <div className="space-y-2">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : (
          <RoomList rooms={rooms.data ?? []} onRefresh={() => void rooms.refetch()} />
        )
      }
    >
      <div className="mx-auto flex w-full max-w-3xl flex-col px-5 py-8">
        <StoriesRail />
        <p className="mt-8 text-sm text-accent">أهلاً بك في وصل</p>
        <h1 className="mt-2 font-display text-4xl leading-tight md:text-5xl">جسر هادئ بين الناس</h1>
        <p className="mt-4 max-w-lg text-muted">
          اضغط اسماً لإضافة صديق أو محادثة أو اتصال. أرسل هدية داخل الغرفة، وانشر قصة تختفي بعد يوم.
        </p>

        <section className="mt-8">
          <p className="mb-3 text-xs text-subtle">متواجدون الآن</p>
          {(online.data ?? []).length === 0 ? (
            <p className="text-sm text-muted">لا أحد ظاهر حالياً. ادعُ صديقاً أو ادخل غرفة.</p>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-1">
              {(online.data ?? []).map((person) => (
                <UserActions key={person.user_id} person={person}>
                  <button type="button" className="flex w-16 shrink-0 flex-col items-center gap-1.5">
                    <span className="relative">
                      <Avatar className="size-12">
                        {person.avatar_url ? <AvatarImage src={person.avatar_url} alt="" /> : null}
                        <AvatarFallback>{initials(person.display_name)}</AvatarFallback>
                      </Avatar>
                      <span className="absolute bottom-0 left-0 size-2.5 rounded-full border-2 border-bg bg-ok" />
                    </span>
                    <span className="w-full truncate text-center text-[11px] text-muted">{person.display_name}</span>
                  </button>
                </UserActions>
              ))}
            </div>
          )}
        </section>

        <div className="mt-8 lg:hidden">
          {rooms.isPending ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <RoomList rooms={rooms.data ?? []} onRefresh={() => void rooms.refetch()} />
          )}
        </div>
      </div>
    </AppShell>
  );
}
