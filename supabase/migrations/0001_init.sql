-- Cafe Money: initial schema. All money is numeric(14,2). Every row is scoped by cafe_id.
create extension if not exists pgcrypto;

create table cafes (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  timezone text not null default 'Africa/Addis_Ababa',
  receptionist_can_close boolean not null default true,
  created_at timestamptz not null default now()
);

create table users (
  id uuid primary key default gen_random_uuid(),
  telegram_user_id bigint unique,
  auth_user_id uuid unique references auth.users(id) on delete set null, -- dashboard login
  name text not null check (char_length(name) between 1 and 100),
  language text not null default 'en' check (language in ('en','am','om')),
  created_at timestamptz not null default now()
);

create table cafe_members (
  id uuid primary key default gen_random_uuid(),
  cafe_id uuid not null references cafes(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role text not null check (role in ('OWNER','RECEPTIONIST')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (cafe_id, user_id)
);
create index on cafe_members (user_id);

create table payment_methods (
  id uuid primary key default gen_random_uuid(),
  cafe_id uuid not null references cafes(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 50),
  type text not null check (type in ('CASH','TELEBIRR','CBE','OTHER')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (cafe_id, name)
);

create table expense_categories (
  id uuid primary key default gen_random_uuid(),
  cafe_id uuid not null references cafes(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 50),
  emoji text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (cafe_id, name)
);

create table transactions (
  id uuid primary key default gen_random_uuid(),
  cafe_id uuid not null references cafes(id) on delete cascade,
  user_id uuid not null references users(id),
  type text not null check (type in ('INCOME','EXPENSE')),
  amount numeric(14,2) not null check (amount > 0),
  payment_method_id uuid not null references payment_methods(id),
  category_id uuid references expense_categories(id),
  note text check (char_length(note) <= 300),
  telegram_update_id bigint,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- a retried Telegram update can never create a second transaction
  unique (cafe_id, telegram_update_id)
);
create index on transactions (cafe_id, created_at);
create index on transactions (cafe_id, type, created_at);
create index on transactions (cafe_id, payment_method_id, created_at);

create table cash_reconciliations (
  id uuid primary key default gen_random_uuid(),
  cafe_id uuid not null references cafes(id) on delete cascade,
  user_id uuid not null references users(id),
  date date not null, -- cafe-local business date
  expected_cash numeric(14,2) not null,
  actual_cash numeric(14,2) not null check (actual_cash >= 0),
  difference numeric(14,2) not null,
  reason text check (reason in ('EXPENSE_NOT_RECORDED','REFUND','CASH_MISTAKE','OTHER','NONE')),
  note text,
  supersedes_id uuid references cash_reconciliations(id), -- append-only audit trail
  created_at timestamptz not null default now()
);
create index on cash_reconciliations (cafe_id, date);

create table daily_closings (
  id uuid primary key default gen_random_uuid(),
  cafe_id uuid not null references cafes(id) on delete cascade,
  date date not null,
  closed_by uuid not null references users(id),
  total_income numeric(14,2) not null,
  total_expenses numeric(14,2) not null,
  net numeric(14,2) not null,
  expected_cash numeric(14,2) not null,
  reopened_by uuid references users(id),
  reopened_at timestamptz,
  created_at timestamptz not null default now(),
  unique (cafe_id, date) -- prevents duplicate closing
);
create index on daily_closings (cafe_id, date);

create table conversation_states (
  telegram_user_id bigint primary key,
  state text not null,
  data jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

create table telegram_updates (
  update_id bigint primary key, -- insert-first dedupe: conflict = already processed
  received_at timestamptz not null default now()
);

-- Row Level Security. The bot/server uses the service role (bypasses RLS) AND checks
-- membership in code; these policies protect dashboard (anon/authenticated) access.
create or replace function is_cafe_member(c uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from cafe_members m join users u on u.id = m.user_id
    where m.cafe_id = c and m.active and u.auth_user_id = auth.uid()
  );
$$;

do $$
declare t text;
begin
  foreach t in array array['cafes','users','cafe_members','payment_methods','expense_categories',
    'transactions','cash_reconciliations','daily_closings','conversation_states','telegram_updates']
  loop execute format('alter table %I enable row level security', t); end loop;
end $$;

create policy cafes_select on cafes for select using (is_cafe_member(id));
create policy users_select_self on users for select using (auth_user_id = auth.uid());
create policy members_select on cafe_members for select using (is_cafe_member(cafe_id));
create policy pm_select on payment_methods for select using (is_cafe_member(cafe_id));
create policy cat_select on expense_categories for select using (is_cafe_member(cafe_id));
create policy tx_select on transactions for select using (is_cafe_member(cafe_id));
create policy rec_select on cash_reconciliations for select using (is_cafe_member(cafe_id));
create policy close_select on daily_closings for select using (is_cafe_member(cafe_id));
-- No client write policies: all writes go through server routes with explicit authorization.
-- conversation_states and telegram_updates have no policies: service role only.

-- Cafe-local business date for a timestamp (never use UTC dates for "today").
create or replace function cafe_local_date(ts timestamptz, tz text) returns date
language sql immutable as $$ select (ts at time zone tz)::date $$;
