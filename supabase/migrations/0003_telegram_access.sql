-- Upgrade for databases created with 0001_init.sql and 0002_invites.sql.
alter table users add column if not exists last_login_at timestamptz;
alter table cafes add column if not exists owner_telegram_id bigint;
create unique index if not exists cafes_owner_telegram_id_key
  on cafes(owner_telegram_id) where owner_telegram_id is not null;