alter table profiles add column if not exists points int not null default 0;

create table if not exists point_events (
  user_id text not null,
  key text not null,
  amount int not null,
  created_at timestamptz not null default now(),
  primary key (user_id, key)
);
