create table if not exists public.account_login_lookup (
  user_id uuid primary key references auth.users (id) on delete cascade,
  phone text unique,
  email text not null
);

alter table public.account_login_lookup enable row level security;
revoke all on public.account_login_lookup from anon, authenticated;

create or replace function public.sync_account_login_lookup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.account_login_lookup (user_id, phone, email)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'phone_number', ''),
    new.email
  )
  on conflict (user_id) do update
    set phone = excluded.phone, email = excluded.email;
  return new;
end;
$$;

drop trigger if exists sync_account_login_lookup on auth.users;
create trigger sync_account_login_lookup
  after insert or update of email, raw_user_meta_data on auth.users
  for each row execute function public.sync_account_login_lookup();

insert into public.account_login_lookup (user_id, phone, email)
select id, nullif(raw_user_meta_data ->> 'phone_number', ''), email
from auth.users
on conflict (user_id) do update
  set phone = excluded.phone, email = excluded.email;
