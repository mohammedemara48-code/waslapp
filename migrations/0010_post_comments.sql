create table if not exists post_comments (
  id serial primary key,
  post_id int not null references posts(id) on delete cascade,
  user_id text not null,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists post_comments_post_idx on post_comments (post_id, id);
