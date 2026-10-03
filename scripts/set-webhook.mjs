// Usage: TELEGRAM_BOT_TOKEN=... TELEGRAM_WEBHOOK_SECRET=... NEXT_PUBLIC_APP_URL=https://x.vercel.app node scripts/set-webhook.mjs
const { TELEGRAM_BOT_TOKEN: t, TELEGRAM_WEBHOOK_SECRET: s, NEXT_PUBLIC_APP_URL: u } = process.env;
const r = await fetch(`https://api.telegram.org/bot${t}/setWebhook`, {
  method: "POST", headers: { "content-type": "application/json" },
  body: JSON.stringify({ url: `${u}/api/telegram/webhook`, secret_token: s, allowed_updates: ["message", "callback_query"] }),
});
console.log(await r.json());
