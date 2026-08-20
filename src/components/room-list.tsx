import { Link } from "@tanstack/react-router";
import { Hash } from "lucide-react";
import type { RoomRow } from "@/lib/chat/types";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CreateRoomDialog } from "@/components/create-room-dialog";

export function RoomList({
  rooms,
  activeSlug,
  onRefresh,
}: {
  rooms: RoomRow[];
  activeSlug?: string;
  onRefresh?: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="px-1 pb-3">
        <CreateRoomDialog onCreated={onRefresh} />
      </div>
      <ScrollArea className="flex-1">
        <ul className="space-y-1 pe-2">
          {rooms.map((room) => {
            const active = room.slug === activeSlug;
            return (
              <li key={room.slug}>
                <Link
                  to="/r/$slug"
                  params={{ slug: room.slug }}
                  className={cn(
                    "flex items-start gap-2.5 rounded-lg px-3 py-2.5 transition-colors duration-150",
                    active ? "bg-elevated text-fg" : "text-muted hover:bg-elevated/70 hover:text-fg",
                  )}
                >
                  <Hash className="mt-0.5 size-4 shrink-0 text-accent" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{room.name}</span>
                    <span className="mt-0.5 block truncate text-xs text-subtle">
                      {room.last_body ?? room.description}
                    </span>
                  </span>
                  <span className="pt-0.5 text-[11px] tabular-nums text-subtle">{room.member_count}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </ScrollArea>
    </div>
  );
}
