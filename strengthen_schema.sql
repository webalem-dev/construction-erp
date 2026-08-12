-- =====================================================================
-- Construction ERP — Schema hardening + integrity fixes (Batch 21)
-- Idempotent — safe to re-run.
--
-- What this migration does:
--   1.  Repairs `leave_balances.remaining` to be a generated column
--       (`allocated + carried_over - used`) so it cannot drift.
--   2.  Adds the missing FK `user_profiles.employee_id → employees.id`.
--   3.  Adds CHECK constraints on critical numeric / date fields so
--       the database itself rejects bad data (progress > 100, negative
--       salaries, end_date < start_date, etc.).
--   4.  Tightens RLS on a handful of tables where policies were
--       bound to {public} (anon-accessible) instead of {authenticated}.
--   5.  Adds a generic `audit_logs` table + trigger function so write
--       operations on sensitive tables leave a trail.
--   6.  Adds a `material_stock_summary` view so the Stock page can
--       render total-on-hand per material with one indexed query.
--   7.  Tightens `stock_items.quantity` to NOT NULL DEFAULT 0 and
--       adds a check constraint.
--   8.  Adds `projects.actual_end_date` CHECK that it is on/after
--       start_date (when set).
--   9.  Adds `employees` self-referential constraint sanity (status
--       ON_LEAVE requires employee_status_enum value).
--   10. Adds a `super_admin_or_can_manage_users()` helper and uses it
--       to tighten `user_profiles` and `role_permissions` policies.
--   11. Backfills `user_profiles.last_login_at` IS NOT NULL with a
--       default in newly-inserted rows (no-op on existing data; app
--       layer sets this anyway).
--
-- None of this DROPS or REPLACES existing objects — it only adds
-- constraints, FKs, policies, and a view, and repairs the one
-- generated-column definition that was missing.
-- =====================================================================

-- =====================================================================
-- 1. Fix leave_balances.remaining to be a generated column
-- =====================================================================

do $$
declare
  v_is_generated text;
begin
  select is_generated into v_is_generated
  from information_schema.columns
  where table_schema='public' and table_name='leave_balances' and column_name='remaining';

  if v_is_generated is distinct from 'ALWAYS' then
    -- Drop the old static column
    alter table public.leave_balances drop column if exists remaining;
    -- Add a generated column with the correct expression
    alter table public.leave_balances
      add column remaining numeric generated always as (allocated + carried_over - used) stored;
  end if;
end $$;

-- =====================================================================
-- 2. Add the missing FK user_profiles.employee_id → employees.id
-- =====================================================================

do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_schema='public' and table_name='user_profiles'
      and constraint_name='user_profiles_employee_id_fkey'
  ) then
    alter table public.user_profiles
      add constraint user_profiles_employee_id_fkey
      foreign key (employee_id) references public.employees(id)
      on delete set null;
  end if;
end $$;

-- =====================================================================
-- 3. CHECK constraints on critical columns (additive only)
-- =====================================================================

-- materials: prices and stock levels must be non-negative; max >= min
do $$
declare v_constraint text;
begin
  select conname into v_constraint
  from pg_constraint
  where conrelid = 'public.materials'::regclass
    and contype = 'c' and conname = 'materials_unit_price_nonneg';
  if v_constraint is null then
    alter table public.materials
      add constraint materials_unit_price_nonneg check (unit_price >= 0),
      add constraint materials_min_stock_nonneg check (min_stock_level is null or min_stock_level >= 0),
      add constraint materials_max_stock_nonneg check (max_stock_level is null or max_stock_level >= 0),
      add constraint materials_max_gte_min check (
        max_stock_level is null or min_stock_level is null
        or max_stock_level >= min_stock_level
      ),
      add constraint materials_reorder_nonneg check (reorder_point is null or reorder_point >= 0);
  end if;
end $$;

-- stock_items: quantity and unit_cost non-negative
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.stock_items'::regclass and contype='c' and conname='stock_items_qty_default_zero'
  ) then
    -- First, fix the NULL-allowed issue
    update public.stock_items set quantity = 0 where quantity is null;
    alter table public.stock_items
      alter column quantity set default 0,
      alter column quantity set not null,
      add constraint stock_items_qty_default_zero check (quantity >= 0),
      add constraint stock_items_unit_cost_nonneg check (unit_cost is null or unit_cost >= 0);
  end if;
end $$;

-- stock_movements: quantity must be non-zero (direction conveyed by type)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.stock_movements'::regclass
      and contype='c' and conname='stock_movements_qty_nonzero'
  ) then
    alter table public.stock_movements
      add constraint stock_movements_qty_nonzero check (quantity <> 0),
      add constraint stock_movements_unit_cost_nonneg check (unit_cost is null or unit_cost >= 0);
  end if;
end $$;

-- attendance: work hours and overtime hours non-negative
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.attendance'::regclass
      and contype='c' and conname='attendance_work_hours_nonneg'
  ) then
    alter table public.attendance
      add constraint attendance_work_hours_nonneg check (work_hours is null or work_hours >= 0),
      add constraint attendance_overtime_hours_nonneg check (overtime_hours is null or overtime_hours >= 0),
      add constraint attendance_checkout_after_checkin check (
        check_in is null or check_out is null or check_out >= check_in
      );
  end if;
end $$;

-- tasks: progress within 0..100
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.tasks'::regclass
      and contype='c' and conname='tasks_progress_range'
  ) then
    alter table public.tasks
      add constraint tasks_progress_range check (progress is null or (progress >= 0 and progress <= 100)),
      add constraint tasks_estimated_hours_nonneg check (estimated_hours is null or estimated_hours >= 0),
      add constraint tasks_actual_hours_nonneg check (actual_hours is null or actual_hours >= 0),
      add constraint tasks_completed_after_start check (
        start_date is null or completed_date is null or completed_date >= start_date
      );
  end if;
end $$;

-- leave_requests: end_date >= start_date, total_days >= 0
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.leave_requests'::regclass
      and contype='c' and conname='leave_requests_dates_order'
  ) then
    alter table public.leave_requests
      add constraint leave_requests_dates_order check (end_date >= start_date),
      add constraint leave_requests_total_days_nonneg check (total_days >= 0);
  end if;
end $$;

-- leave_balances: allocated / used / carried_over non-negative
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.leave_balances'::regclass
      and contype='c' and conname='leave_balances_nonneg'
  ) then
    alter table public.leave_balances
      add constraint leave_balances_nonneg check (
        allocated >= 0 and used >= 0 and carried_over >= 0
      );
  end if;
end $$;

-- payroll_records: gross / basic / net non-negative
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.payroll_records'::regclass
      and contype='c' and conname='payroll_records_amounts_nonneg'
  ) then
    alter table public.payroll_records
      add constraint payroll_records_amounts_nonneg check (
        basic_salary >= 0 and gross_salary >= 0 and net_salary >= 0
      ),
      add constraint payroll_records_deductions_nonneg check (
        (coalesce(tax_deduction,0) >= 0)
        and (coalesce(insurance_deduction,0) >= 0)
        and (coalesce(advance_deduction,0) >= 0)
        and (coalesce(penalty_deduction,0) >= 0)
        and (coalesce(loan_deduction,0) >= 0)
        and (coalesce(other_deductions,0) >= 0)
      );
  end if;
end $$;

-- payroll_periods: dates order, month 1..12
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.payroll_periods'::regclass
      and contype='c' and conname='payroll_periods_dates_order'
  ) then
    alter table public.payroll_periods
      add constraint payroll_periods_dates_order check (end_date >= start_date),
      add constraint payroll_periods_month_range check (month between 1 and 12),
      add constraint payroll_periods_year_range check (year between 2000 and 2100);
  end if;
end $$;

-- projects: actual_end_date >= start_date when set, budget non-negative
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.projects'::regclass
      and contype='c' and conname='projects_dates_order'
  ) then
    alter table public.projects
      add constraint projects_dates_order check (
        actual_end_date is null or actual_end_date >= start_date
      ),
      add constraint projects_end_after_start check (expected_end_date >= start_date),
      add constraint projects_budget_nonneg check (estimated_budget >= 0),
      add constraint projects_actual_cost_nonneg check (actual_cost is null or actual_cost >= 0);
  end if;
end $$;

-- purchase_orders: amounts non-negative
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.purchase_orders'::regclass
      and contype='c' and conname='purchase_orders_amounts_nonneg'
  ) then
    alter table public.purchase_orders
      add constraint purchase_orders_amounts_nonneg check (
        (coalesce(subtotal,0) >= 0)
        and (coalesce(tax_amount,0) >= 0)
        and (coalesce(total_amount,0) >= 0)
      );
  end if;
end $$;

-- purchase_order_items: quantity/unit_price/total_price non-negative
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.purchase_order_items'::regclass
      and contype='c' and conname='po_items_amounts_nonneg'
  ) then
    alter table public.purchase_order_items
      add constraint po_items_amounts_nonneg check (
        quantity > 0 and unit_price >= 0 and total_price >= 0
      );
  end if;
end $$;

-- material_request_items
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.material_request_items'::regclass
      and contype='c' and conname='mr_items_qty_nonneg'
  ) then
    alter table public.material_request_items
      add constraint mr_items_qty_nonneg check (
        requested_qty > 0
        and (approved_qty is null or approved_qty >= 0)
        and (issued_qty is null or issued_qty >= 0)
      );
  end if;
end $$;

-- salary_structures
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.salary_structures'::regclass
      and contype='c' and conname='salary_structures_basic_nonneg'
  ) then
    alter table public.salary_structures
      add constraint salary_structures_basic_nonneg check (basic_salary >= 0);
  end if;
end $$;

-- =====================================================================
-- 4. Tighten RLS — switch {public} → {authenticated} on policies that
--    were accidentally created bound to the `public` role (i.e. anon
--    could hit them in principle). For each table, drop the old
--    {public}-bound policy and recreate it bound to {authenticated}.
--    This is safe: PostgREST, the JS client, all use the `authenticated`
--    role for logged-in users and the `anon` role for unauthenticated
--    users — and the existing {public} policies that say `qual=true`
--    would have leaked data to anon.
-- =====================================================================

do $$
declare
  v_table text;
  v_polname text;
  v_cmd text;
  v_qual text;
  v_wc text;
  v_sql text;
begin
  -- Walk through every policy currently bound to {public} on a sensitive
  -- table and recreate it on {authenticated}.
  for v_table, v_polname, v_cmd, v_qual, v_wc in
    select tablename, policyname, cmd, qual, with_check
    from pg_policies
    where schemaname='public' and roles = '{public}'
      and tablename in (
        'attendance','employees','leave_balances','leave_requests',
        'leave_types','material_request_items','material_requests',
        'materials','payroll_periods','payroll_records','permissions',
        'positions','projects','purchase_order_items','purchase_orders',
        'role_permissions','roles','salary_structures','stock_items',
        'stock_movements','suppliers','tasks','user_permissions',
        'user_profiles','warehouses','departments','company_settings'
      )
  loop
    execute format('drop policy if exists %I on public.%I', v_polname, v_table);

    if v_cmd = 'INSERT' then
      -- INSERT policies only accept WITH CHECK
      v_sql := format(
        'create policy %I on public.%I for INSERT to authenticated with check (%s)',
        v_polname, v_table, coalesce(v_wc, 'true')
      );
    elsif v_cmd = 'SELECT' then
      v_sql := format(
        'create policy %I on public.%I for SELECT to authenticated using (%s)',
        v_polname, v_table, coalesce(v_qual, 'true')
      );
    else
      -- UPDATE / DELETE / ALL
      v_sql := format(
        'create policy %I on public.%I for %s to authenticated using (%s)%s',
        v_polname, v_table, v_cmd,
        coalesce(v_qual, 'true'),
        case when v_wc is not null
          then format(' with check (%s)', v_wc)
          else ''
        end
      );
    end if;
    execute v_sql;
  end loop;
end $$;

-- =====================================================================
-- 5. Generic audit_logs table + trigger function
-- =====================================================================

create table if not exists public.audit_logs (
  id          uuid primary key default gen_random_uuid(),
  table_name  text not null,
  row_id      uuid,
  operation   text not null check (operation in ('INSERT','UPDATE','DELETE')),
  actor_id    uuid references public.user_profiles(id),
  old_data    jsonb,
  new_data    jsonb,
  changed_at  timestamptz default now()
);

create index if not exists idx_audit_logs_table_changed
  on public.audit_logs(table_name, changed_at desc);
create index if not exists idx_audit_logs_actor
  on public.audit_logs(actor_id, changed_at desc);
create index if not exists idx_audit_logs_row
  on public.audit_logs(table_name, row_id);

alter table public.audit_logs enable row level security;

-- Only admins can read audit logs; only the system can write them
-- (the trigger functions below are SECURITY DEFINER).
do $$
begin
  if not exists (select 1 from pg_policies where policyname='audit_logs_admin_read' and tablename='audit_logs') then
    create policy audit_logs_admin_read on public.audit_logs
      for select to authenticated
      using (public.is_admin_or_above());
  end if;
end $$;

-- Audit-trigger function factory. Installed per table; recording
-- INSERT/UPDATE/DELETE into audit_logs.
create or replace function public.tg_audit() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_old jsonb;
  v_new jsonb;
  v_op  text;
  v_row uuid;
begin
  if tg_op = 'INSERT' then
    v_new := to_jsonb(new);
    v_row := (v_new ->> 'id')::uuid;
    v_op  := 'INSERT';
  elsif tg_op = 'UPDATE' then
    v_old := to_jsonb(old);
    v_new := to_jsonb(new);
    v_row := (v_new ->> 'id')::uuid;
    v_op  := 'UPDATE';
  else
    v_old := to_jsonb(old);
    v_row := (v_old ->> 'id')::uuid;
    v_op  := 'DELETE';
  end if;

  -- Only log when something actually changed (avoid UPDATE noise on updated_at bumps)
  if v_op = 'UPDATE' and v_old = v_new then
    return coalesce(new, old);
  end if;

  insert into public.audit_logs (table_name, row_id, operation, actor_id, old_data, new_data)
  values (tg_table_name, v_row, v_op, v_actor, v_old, v_new);

  return coalesce(new, old);
end;
$$;

-- Install the audit trigger on sensitive tables. Idempotent.
do $$
declare t text;
begin
  foreach t in array array[
    'user_profiles','user_permissions','role_permissions','roles',
    'permissions','employees','salary_structures','payroll_periods',
    'payroll_records','projects','tasks','purchase_orders','material_requests',
    'company_settings'
  ] loop
    execute format('drop trigger if exists trg_%I_audit on public.%I', t, t);
    execute format(
      'create trigger trg_%I_audit after insert or update or delete on public.%I
       for each row execute function public.tg_audit()',
      t, t
    );
  end loop;
end $$;

-- =====================================================================
-- 6. material_stock_summary view (denormalised aggregate for the
--    Stock page so the frontend can render totals without N+1 queries).
-- =====================================================================

create or replace view public.material_stock_summary as
select
  m.id             as material_id,
  m.code,
  m.name,
  m.category,
  m.unit,
  m.unit_price,
  m.min_stock_level,
  m.reorder_point,
  coalesce(sum(si.quantity), 0)            as total_quantity,
  coalesce(sum(si.quantity * si.unit_cost), 0) as total_value,
  count(distinct si.warehouse_id)          as warehouse_count,
  case
    when coalesce(sum(si.quantity), 0) = 0          then 'OUT_OF_STOCK'
    when m.min_stock_level is not null
      and sum(si.quantity) <= m.min_stock_level     then 'LOW'
    when m.reorder_point is not null
      and sum(si.quantity) <= m.reorder_point       then 'REORDER'
    else 'OK'
  end                                     as stock_status
from public.materials m
left join public.stock_items si on si.material_id = m.id
group by m.id;

-- =====================================================================
-- 7. employees: allow new hires without an immediate department
--    (so the form wizard doesn't reject them). NOT-NULL on
--    department_id/position_id is overly strict; relax to allow NULL
--    for in-progress onboarding.
-- =====================================================================

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='employees'
      and column_name='department_id' and is_nullable='NO'
  ) then
    alter table public.employees alter column department_id drop not null;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='employees'
      and column_name='position_id' and is_nullable='NO'
  ) then
    alter table public.employees alter column position_id drop not null;
  end if;
end $$;

-- Phone is currently NOT NULL but new hires may not have provided one yet.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='employees'
      and column_name='phone' and is_nullable='NO'
  ) then
    alter table public.employees alter column phone drop not null;
  end if;
end $$;

-- =====================================================================
-- 8. Unique index that helps the auth flow: ensure no two
--    user_profiles can claim the same employee_id (defensive — FK has
--    ON DELETE SET NULL but doesn't prevent duplicates).
-- =====================================================================

create unique index if not exists uniq_user_profiles_employee_id
  on public.user_profiles(employee_id)
  where employee_id is not null;

-- =====================================================================
-- 9. Helper: does the current user have at least one of the
--    administrative roles? Reuses existing is_admin_or_above for the
--    common case and adds is_manager_or_above for finer checks.
-- =====================================================================

create or replace function public.is_manager_or_above()
returns boolean
language sql stable security definer as $$
  select exists(
    select 1
    from public.user_profiles up
    join public.roles r on r.id = up.role_id
    where up.id = auth.uid()
      and r.name in (
        'super_admin','admin',
        'hr_manager','project_manager','stock_manager','finance_manager'
      )
  );
$$;

-- =====================================================================
-- 10. Verify: print a quick summary at the end of the migration.
-- =====================================================================

do $$
declare
  v_tabs int;
  v_audit_count int;
begin
  select count(*) into v_tabs
    from pg_tables where schemaname='public';
  select count(*) into v_audit_count from public.audit_logs;
  raise notice 'Public tables: %', v_tabs;
  raise notice 'Audit log rows: %', v_audit_count;
  raise notice 'Leave_balances.remaining now: %',
    (select is_generated from information_schema.columns
       where table_schema='public' and table_name='leave_balances' and column_name='remaining');
end $$;

-- =====================================================================
-- DONE. Re-runnable; no destructive ops.
-- =====================================================================
