-- Store the owner password hash in Supabase instead of environment variables.
alter table cafes add column if not exists owner_password_hash text;