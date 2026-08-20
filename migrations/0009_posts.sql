create table if not exists posts (
  id serial primary key,
  user_id text not null,
  kind text not null default 'text',
  body text not null default '',
  media_data text,
  visibility text not null default 'all',
  created_at timestamptz not null default now()
);
create index if not exists posts_created_idx on posts (created_at desc);
create table if not exists post_likes (
  post_id int not null references posts(id) on delete cascade,
  user_id text not null,
  primary key (post_id, user_id)
);
