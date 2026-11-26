create table if not exists public.staff_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  workspace_id text not null,
  staff_id bigint not null,
  phone text not null,
  role text not null check (role in ('Administrator', 'Manager', 'Cashier', 'Inventory clerk')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (owner_id, workspace_id, staff_id),
  unique (owner_id, phone)
);

create index if not exists staff_accounts_owner_workspace_idx
  on public.staff_accounts (owner_id, workspace_id) where active;

alter table public.staff_accounts enable row level security;
revoke all on public.staff_accounts from anon, authenticated;

create or replace function public.get_my_staff_access()
returns jsonb
language sql stable security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'owner_id', s.owner_id,
    'workspace_id', s.workspace_id,
    'staff_id', s.staff_id,
    'role', s.role,
    'phone', s.phone,
    'active', s.active
  )
  from public.staff_accounts s
  where s.user_id = (select auth.uid())
  limit 1;
$$;
revoke all on function public.get_my_staff_access() from public, anon;
grant execute on function public.get_my_staff_access() to authenticated;

create or replace function public.get_my_staff_account_status()
returns table (staff_id bigint, active boolean, phone text)
language plpgsql stable security definer
set search_path = ''
as $$
declare
  membership public.staff_accounts%rowtype;
begin
  select * into membership from public.staff_accounts s where s.user_id = (select auth.uid()) and s.active limit 1;
  if found then
    if membership.role = 'Administrator' then
      return query select s.staff_id, s.active, s.phone from public.staff_accounts s where s.owner_id = membership.owner_id and s.workspace_id = membership.workspace_id;
    end if;
    return;
  end if;
  return query select s.staff_id, s.active, s.phone from public.staff_accounts s where s.owner_id = (select auth.uid());
end;
$$;
revoke all on function public.get_my_staff_account_status() from public, anon;
grant execute on function public.get_my_staff_account_status() to authenticated;

create or replace function public.update_staff_account(p_workspace_id text, p_staff_id bigint, p_active boolean, p_role text, p_phone text)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_owner_id uuid := (select auth.uid());
  membership public.staff_accounts%rowtype;
begin
  select * into membership from public.staff_accounts s where s.user_id = (select auth.uid()) and s.active limit 1;
  if found then
    if membership.role <> 'Administrator' or membership.workspace_id <> p_workspace_id then raise exception 'Staff management access denied'; end if;
    v_owner_id := membership.owner_id;
  end if;
  if p_role not in ('Administrator', 'Manager', 'Cashier', 'Inventory clerk') or not exists (
    select 1 from public.business_workspaces w where w.owner_id = v_owner_id and w.workspace_id = p_workspace_id
  ) then raise exception 'Staff workspace not found'; end if;
  update public.staff_accounts as sa set active = p_active, role = p_role, phone = p_phone
    where sa.owner_id = v_owner_id and sa.workspace_id = p_workspace_id and sa.staff_id = p_staff_id;
end;
$$;
revoke all on function public.update_staff_account(text, bigint, boolean, text, text) from public, anon;
grant execute on function public.update_staff_account(text, bigint, boolean, text, text) to authenticated;

create or replace function public.get_accessible_workspaces()
returns table (workspace_id text, name text, data jsonb)
language plpgsql stable security definer
set search_path = ''
as $$
declare
  membership public.staff_accounts%rowtype;
  workspace public.business_workspaces%rowtype;
  safe_data jsonb;
begin
  select * into membership from public.staff_accounts s
    where s.user_id = (select auth.uid()) limit 1;
  if not found then return; end if;
  if not membership.active then return; end if;
  select * into workspace from public.business_workspaces w
    where w.owner_id = membership.owner_id and w.workspace_id = membership.workspace_id;
  if not found then return; end if;

  if membership.role = 'Administrator' then
    safe_data := workspace.data;
  elsif membership.role = 'Manager' then
    safe_data := workspace.data || jsonb_build_object(
      'settings', jsonb_build_object(
        'businessName', workspace.data #> '{settings,businessName}', 'businessType', workspace.data #> '{settings,businessType}',
        'country', workspace.data #> '{settings,country}', 'currency', workspace.data #> '{settings,currency}',
        'calendar', workspace.data #> '{settings,calendar}', 'invoicePrefix', workspace.data #> '{settings,invoicePrefix}',
        'fiscalYear', workspace.data #> '{settings,fiscalYear}', 'owner','""'::jsonb,'ownerEmail','""'::jsonb,
        'dateOfBirth','""'::jsonb,'permanentAddress','""'::jsonb,'temporaryAddress','""'::jsonb
      ),
      'staff', '[]'::jsonb, 'attendance', '[]'::jsonb, 'salaryPayments', '[]'::jsonb
    );
  elsif membership.role = 'Cashier' then
    safe_data := jsonb_build_object(
      'settings', jsonb_build_object(
        'businessName', workspace.data #> '{settings,businessName}',
        'businessType', workspace.data #> '{settings,businessType}',
        'country', workspace.data #> '{settings,country}', 'currency', workspace.data #> '{settings,currency}',
        'calendar', workspace.data #> '{settings,calendar}', 'invoicePrefix', workspace.data #> '{settings,invoicePrefix}',
        'fiscalYear', workspace.data #> '{settings,fiscalYear}', 'owner', '""'::jsonb,
        'ownerEmail', '""'::jsonb, 'dateOfBirth', '""'::jsonb, 'permanentAddress', '""'::jsonb, 'temporaryAddress', '""'::jsonb
      ),
      'transactions', coalesce((select jsonb_agg(t.value) from jsonb_array_elements(coalesce(workspace.data->'transactions','[]'::jsonb)) t(value) where t.value->>'type' = 'Sale'), '[]'::jsonb),
      'contacts', coalesce((select jsonb_agg(c.value) from jsonb_array_elements(coalesce(workspace.data->'contacts','[]'::jsonb)) c(value) where c.value->>'type' = 'Customer'), '[]'::jsonb),
      'items', coalesce(workspace.data->'items','[]'::jsonb),
      'accounts', coalesce((select jsonb_agg(a.value || jsonb_build_object('balance',0)) from jsonb_array_elements(coalesce(workspace.data->'accounts','[]'::jsonb)) a(value)), '[]'::jsonb),
      'invoices', '[]'::jsonb, 'purchases', '[]'::jsonb, 'staff', '[]'::jsonb, 'attendance', '[]'::jsonb, 'salaryPayments', '[]'::jsonb
    );
  else
    safe_data := jsonb_build_object(
      'settings', jsonb_build_object('businessName', workspace.data #> '{settings,businessName}', 'country', workspace.data #> '{settings,country}', 'currency', workspace.data #> '{settings,currency}', 'calendar', workspace.data #> '{settings,calendar}', 'owner','""'::jsonb,'ownerEmail','""'::jsonb,'dateOfBirth','""'::jsonb,'permanentAddress','""'::jsonb,'temporaryAddress','""'::jsonb),
      'items', coalesce(workspace.data->'items','[]'::jsonb),
      'contacts', coalesce((select jsonb_agg(c.value) from jsonb_array_elements(coalesce(workspace.data->'contacts','[]'::jsonb)) c(value) where c.value->>'type' = 'Supplier'), '[]'::jsonb),
      'transactions', '[]'::jsonb, 'invoices', '[]'::jsonb, 'purchases', '[]'::jsonb, 'accounts', '[]'::jsonb,
      'staff', '[]'::jsonb, 'attendance', '[]'::jsonb, 'salaryPayments', '[]'::jsonb
    );
  end if;
  return query select workspace.workspace_id, workspace.name, safe_data;
end;
$$;
revoke all on function public.get_accessible_workspaces() from public, anon;
grant execute on function public.get_accessible_workspaces() to authenticated;

create or replace function public.save_accessible_workspace(p_workspace_id text, p_name text, p_data jsonb)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  membership public.staff_accounts%rowtype;
  existing public.business_workspaces%rowtype;
  merged jsonb;
  sale jsonb;
  old_ids jsonb;
  new_sales jsonb := '[]'::jsonb;
  new_customers jsonb := '[]'::jsonb;
  item jsonb;
  old_item jsonb;
  item_id text;
  qty_delta numeric;
  account_id text;
  paid numeric;
begin
  if (select auth.uid()) is null then raise exception 'Sign in required'; end if;
  select * into membership from public.staff_accounts s where s.user_id = (select auth.uid()) limit 1;
  if not found then
    insert into public.business_workspaces(owner_id, workspace_id, name, data, updated_at)
      values ((select auth.uid()), p_workspace_id, p_name, p_data, now())
      on conflict (owner_id, workspace_id) do update set name = excluded.name, data = excluded.data, updated_at = now();
    return;
  end if;
  if not membership.active then raise exception 'Staff access is disabled'; end if;
  if p_workspace_id <> membership.workspace_id then raise exception 'Workspace access denied'; end if;
  select * into existing from public.business_workspaces w
    where w.owner_id = membership.owner_id and w.workspace_id = p_workspace_id for update;
  if not found then raise exception 'Workspace not found'; end if;

  if membership.role = 'Administrator' then
    merged := p_data;
  elsif membership.role = 'Manager' then
    merged := existing.data || jsonb_build_object(
      'transactions', coalesce(p_data->'transactions', existing.data->'transactions'),
      'contacts', coalesce(p_data->'contacts', existing.data->'contacts'),
      'items', coalesce(p_data->'items', existing.data->'items'),
      'invoices', coalesce(p_data->'invoices', existing.data->'invoices'),
      'purchases', coalesce(p_data->'purchases', existing.data->'purchases'),
      'accounts', coalesce(p_data->'accounts', existing.data->'accounts')
    );
  elsif membership.role = 'Cashier' then
    -- A cashier may add sales and customer records. Existing financial/HR rows
    -- always remain server-owned; cash drawer totals are derived from paid sales.
    for sale in select value from jsonb_array_elements(coalesce(p_data->'transactions','[]'::jsonb)) loop
      old_ids := (select coalesce(jsonb_agg(t.value->'id'), '[]'::jsonb) from jsonb_array_elements(coalesce(existing.data->'transactions','[]'::jsonb)) t(value));
      if not (old_ids @> jsonb_build_array(sale->'id')) then
        if sale->>'type' <> 'Sale' then raise exception 'Cashiers can only record sales'; end if;
        if coalesce((sale->>'amount')::numeric,0) <= 0 or coalesce((sale->>'paidAmount')::numeric,0) < 0 or coalesce((sale->>'paidAmount')::numeric,0) > coalesce((sale->>'amount')::numeric,0) then
          raise exception 'Invalid sale amount';
        end if;
        if new_sales @> jsonb_build_array(jsonb_build_object('id', sale->'id')) then raise exception 'Duplicate sale identifier'; end if;
        new_sales := new_sales || jsonb_build_array(sale);
      end if;
    end loop;
    for item in select value from jsonb_array_elements(coalesce(p_data->'contacts','[]'::jsonb)) loop
      old_ids := (select coalesce(jsonb_agg(c.value->'id'), '[]'::jsonb) from jsonb_array_elements(coalesce(existing.data->'contacts','[]'::jsonb)) c(value));
      if not (old_ids @> jsonb_build_array(item->'id')) then
        if item->>'type' <> 'Customer' then raise exception 'Cashiers can only add customers'; end if;
        if new_customers @> jsonb_build_array(jsonb_build_object('id', item->'id')) then raise exception 'Duplicate customer identifier'; end if;
        new_customers := new_customers || jsonb_build_array(item);
      end if;
    end loop;
    merged := existing.data || jsonb_build_object(
      'transactions', coalesce(existing.data->'transactions','[]'::jsonb) || new_sales,
      'contacts', coalesce(existing.data->'contacts','[]'::jsonb) || new_customers
    );
    -- Stock and cash changes are calculated from newly inserted POS lines.
    for sale in select value from jsonb_array_elements(new_sales) loop
      for item in select value from jsonb_array_elements(coalesce(sale->'lineItems','[]'::jsonb)) loop
        item_id := item->>'itemId';
        qty_delta := coalesce((item->>'quantity')::numeric,0);
        if item_id is not null and qty_delta > 0 then
          merged := jsonb_set(merged, '{items}', (
            select jsonb_agg(case when x.value->>'id' = item_id then jsonb_set(x.value, '{qty}', to_jsonb(greatest(0, coalesce((x.value->>'qty')::numeric,0) - qty_delta))) else x.value end)
            from jsonb_array_elements(coalesce(merged->'items','[]'::jsonb)) x(value)
          ));
        end if;
      end loop;
      account_id := sale->>'accountId';
      paid := coalesce((sale->>'paidAmount')::numeric,0);
      if account_id is not null and paid > 0 then
        merged := jsonb_set(merged, '{accounts}', (
          select jsonb_agg(case when a.value->>'id' = account_id then jsonb_set(a.value, '{balance}', to_jsonb(coalesce((a.value->>'balance')::numeric,0) + paid)) else a.value end)
          from jsonb_array_elements(coalesce(merged->'accounts','[]'::jsonb)) a(value)
        ));
      end if;
    end loop;
  else
    -- Inventory clerks can inspect stock and supplier records but cannot alter
    -- payroll, business settings, transactions, or financial accounts.
    merged := existing.data;
  end if;
  update public.business_workspaces set data = merged, updated_at = now()
    where owner_id = membership.owner_id and workspace_id = membership.workspace_id;
end;
$$;
revoke all on function public.save_accessible_workspace(text, text, jsonb) from public, anon;
grant execute on function public.save_accessible_workspace(text, text, jsonb) to authenticated;
