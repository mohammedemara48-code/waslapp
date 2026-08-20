alter table profiles add column if not exists last_seen timestamptz;
alter table profiles add column if not exists presence_notified_at timestamptz;

create table if not exists blocks (
  blocker_id text not null,
  blocked_id text not null,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);

create table if not exists stories (
  id serial primary key,
  user_id text not null,
  kind text not null default 'text',
  body text not null default '',
  image_data text,
  tint text not null default 'ink',
  created_at timestamptz not null default now()
);

create index if not exists stories_user_created_idx on stories (user_id, created_at desc);

create table if not exists story_likes (
  story_id int not null references stories(id) on delete cascade,
  user_id text not null,
  primary key (story_id, user_id)
);

create table if not exists story_views (
  story_id int not null references stories(id) on delete cascade,
  user_id text not null,
  viewed_at timestamptz not null default now(),
  primary key (story_id, user_id)
);
