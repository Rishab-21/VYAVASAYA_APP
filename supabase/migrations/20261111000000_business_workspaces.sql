create table if not exists public.business_workspaces (
  owner_id uuid not null references auth.users (id) on delete cascade,
  workspace_id text not null,
  name text not null,
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (owner_id, workspace_id)
);

create index if not exists business_workspaces_owner_updated_idx
  on public.business_workspaces (owner_id, updated_at desc);

alter table public.business_workspaces enable row level security;

revoke all on public.business_workspaces from anon, authenticated;
grant select, insert, update, delete on public.business_workspaces to authenticated;

drop policy if exists "Users can read their own workspaces" on public.business_workspaces;
create policy "Users can read their own workspaces"
  on public.business_workspaces for select to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = owner_id);

drop policy if exists "Users can create their own workspaces" on public.business_workspaces;
create policy "Users can create their own workspaces"
  on public.business_workspaces for insert to authenticated
  with check ((select auth.uid()) is not null and (select auth.uid()) = owner_id);

drop policy if exists "Users can update their own workspaces" on public.business_workspaces;
create policy "Users can update their own workspaces"
  on public.business_workspaces for update to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = owner_id)
  with check ((select auth.uid()) is not null and (select auth.uid()) = owner_id);

drop policy if exists "Users can delete their own workspaces" on public.business_workspaces;
create policy "Users can delete their own workspaces"
  on public.business_workspaces for delete to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = owner_id);
