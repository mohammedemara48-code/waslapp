alter table room_members add column if not exists last_read_at timestamptz;
alter table rooms add column if not exists pinned_message_id int;

create table if not exists mutes (
  muter_id text not null,
  muted_id text not null,
  created_at timestamptz not null default now(),
  primary key (muter_id, muted_id)
);

create table if not exists reports (
  id serial primary key,
  reporter_id text not null,
  target_id text not null,
  reason text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists saved_messages (
  user_id text not null,
  message_id int not null references messages(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, message_id)
);

create table if not exists mic_queue (
  room_id int not null references rooms(id) on delete cascade,
  user_id text not null,
  requested_at timestamptz not null default now(),
  primary key (room_id, user_id)
);
