# ☕ Cafe Money (Telegram bot, Next.js + Supabase)

## Setup

1. **Supabase:** create a project. In the SQL editor run migrations `0001_init.sql` through `0007_receptionist_password.sql` in order.
2. **Keys:** Project Settings → API → copy URL, anon key, service_role key.
3. **Telegram:** talk to @BotFather → `/newbot` → copy the token.
4. `cp .env.example .env.local` and fill in all values. `TELEGRAM_WEBHOOK_SECRET` = any long random string (A-Z a-z 0-9 \_ -).
   `NEXT_PUBLIC_APP_URL` = your public https URL.
5. `npm install && npm test && npm run dev`
6. Local testing needs an https tunnel (e.g. `ngrok http 3000`); set `NEXT_PUBLIC_APP_URL` to the tunnel URL, then `npm run webhook`.
7. **Vercel:** push to GitHub → import in Vercel → add the 6 env variables → deploy → set `NEXT_PUBLIC_APP_URL` to the Vercel URL → run `npm run webhook` again.
8. **Verify:** send `/start` to your bot; check rows appear in Supabase tables `users`, `cafes`, `transactions`.

## Rebuild database

For a complete destructive rebuild, run `supabase/rebuild.sql` with `psql`. It drops all data and recreates every table from migrations `0001` through `0005`; export or back up production data first.

## Security notes

- Webhook rejects requests without the secret header. Service role key is used server-side only (`lib/db.ts`).
- cafe_id / role are always resolved from the Telegram user's membership, never from user input.
- Telegram IDs and roles are stored in `users` and `cafe_members`; set `cafe_members.active = false` to deactivate a receptionist.
- Owners can also activate or deactivate receptionists from Settings → Manage receptionists.

## Manual Telegram setup

After creating the owner user and membership, set the owner password hash with:

```sql
update cafes
set owner_password_hash = encode(digest('CHANGE_THIS_PASSWORD', 'sha256'), 'hex')
where id = 'CAFE_UUID';
```

Create each receptionist manually by inserting a row in `users` with their numeric `telegram_user_id`, then inserting a `cafe_members` row with `role = 'RECEPTIONIST'`. Set `active = false` to disable access.
