-- Store a separate password hash for each receptionist.
alter table users add column if not exists password_hash text;