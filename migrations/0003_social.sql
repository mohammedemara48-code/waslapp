alter table profiles add column if not exists username text;
alter table profiles add column if not exists phone text;
alter table profiles add column if not exists bio text;
alter table profiles add column if not exists avatar_data text;

create unique index if not exists profiles_username_lower_idx
  on profiles (lower(username))
  where username is not null;

alter table messages add column if not exists attachment_name text;
alter table messages add column if not exists attachment_type text;
alter table messages add column if not exists attachment_data text;

create table if not exists friendships (
  id serial primary key,
  requester_id text not null,
  addressee_id text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  unique (requester_id, addressee_id)
);

create index if not exists friendships_addressee_idx on friendships (addressee_id, status);
create index if not exists friendships_requester_idx on friendships (requester_id, status);

create table if not exists notifications (
  id serial primary key,
  user_id text not null,
  kind text not null,
  title text not null,
  body text not null default '',
  href text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx on notifications (user_id, id desc);
