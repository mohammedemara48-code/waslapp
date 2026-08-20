create sequence if not exists wasl_no_seq start with 1001;
alter table profiles add column if not exists wasl_no integer;
update profiles set wasl_no = nextval('wasl_no_seq') where wasl_no is null;
alter table profiles alter column wasl_no set default nextval('wasl_no_seq');
create unique index if not exists profiles_wasl_no_uidx on profiles (wasl_no);
