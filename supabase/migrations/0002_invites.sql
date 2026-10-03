create table invites (
  code text primary key,
  cafe_id uuid not null references cafes(id) on delete cascade,
  created_by uuid not null references users(id),
  expires_at timestamptz not null,
  used_at timestamptz
);
alter table invites enable row level security; -- service role only
