create table if not exists profiles (
  user_id text primary key,
  display_name text not null,
  email text,
  avatar_url text,
  username text,
  phone text,
  bio text,
  avatar_data text,
  updated_at timestamptz not null default now()
);

create table if not exists rooms (
  id serial primary key,
  slug text not null unique,
  name text not null,
  description text not null default '',
  kind text not null default 'public',
  created_by text not null,
  created_at timestamptz not null default now()
);

create table if not exists room_members (
  room_id int not null references rooms(id) on delete cascade,
  user_id text not null,
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create table if not exists messages (
  id serial primary key,
  room_id int not null references rooms(id) on delete cascade,
  user_id text not null,
  body text not null,
  attachment_name text,
  attachment_type text,
  attachment_data text,
  created_at timestamptz not null default now()
);

create index if not exists messages_room_created_idx on messages (room_id, id);
create index if not exists rooms_created_idx on rooms (created_at desc);

insert into rooms (slug, name, description, kind, created_by)
select 'general', 'الساحة', 'حديث مفتوح لكل من يصل.', 'public', 'system'
where not exists (select 1 from rooms where slug = 'general');

insert into rooms (slug, name, description, kind, created_by)
select 'tech', 'تقنية', 'أدوات، برمجة، ومستقبل الشبكات.', 'public', 'system'
where not exists (select 1 from rooms where slug = 'tech');

insert into rooms (slug, name, description, kind, created_by)
select 'culture', 'ثقافة', 'كتب، سينما، وأفكار تُروى على مهل.', 'public', 'system'
where not exists (select 1 from rooms where slug = 'culture');

insert into rooms (slug, name, description, kind, created_by)
select 'sports', 'رياضة', 'مباريات، تدريب، وجدل ودي.', 'public', 'system'
where not exists (select 1 from rooms where slug = 'sports');
