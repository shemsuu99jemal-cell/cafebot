import { handleUpdate } from "@/lib/bot";
export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  if (req.headers.get("x-telegram-bot-api-secret-token") !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return new Response("forbidden", { status: 403 });
  }
  try {
    await handleUpdate(await req.json());
    return Response.json({ ok: true });
  } catch (e) {
    console.error("webhook error", e);
    return new Response("error", { status: 500 }); // Telegram will retry; dedupe makes that safe
  }
}
