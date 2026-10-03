const api = () =>
  `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;
async function call(method: string, body: unknown) {
  const r = await fetch(`${api()}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) console.error("telegram", method, r.status, await r.text());
}
export const send = (chat: number, text: string, reply_markup?: unknown) =>
  call("sendMessage", { chat_id: chat, text, reply_markup });
export const answer = (id: string) =>
  call("answerCallbackQuery", { callback_query_id: id });
export const inline = (rows: [string, string][][]) => ({
  inline_keyboard: rows.map((r) =>
    r.map(([text, callback_data]) => ({ text, callback_data })),
  ),
});
export const startKeyboard = {
  keyboard: [[{ text: "/start" }]],
  resize_keyboard: true,
  one_time_keyboard: false,
};
