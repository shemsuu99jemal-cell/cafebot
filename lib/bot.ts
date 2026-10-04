import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { db } from "./db";
import { send, answer, inline, startKeyboard } from "./telegram";
import { Lang, LANGS, t, menuAction, menuKeyboard } from "./i18n";
import {
  parseMoney,
  formatMoney,
  calculateIncome,
  calculateExpenses,
  calculateNetIncome,
  calculatePaymentBreakdown,
  calculateExpectedCash,
  calculateCashDifference,
  cafeLocalDate,
  type Tx,
} from "./calculations";

type M = {
  userId: string;
  name: string;
  cafeId: string;
  role: "OWNER" | "RECEPTIONIST";
  tz: string;
  canClose: boolean;
  lang: Lang;
};
type St = { state: string; data: Record<string, any> } | null;
type Rows = [string, string][][];

const LINE = "━━━━━━━━━━━━━━━━";
const head = (s: string) => `${LINE}\n${s}\n${LINE}\n\n`;
const dec = (c: bigint) =>
  `${c < 0n ? "-" : ""}${(c < 0n ? -c : c) / 100n}.${((c < 0n ? -c : c) % 100n).toString().padStart(2, "0")}`;
const etb = (c: bigint) => `${formatMoney(c)} ETB`;
const ico = (type: string) =>
  type === "CASH" ? "💵" : type === "TELEBIRR" ? "📱" : "🏦";
const one = (x: any) => (Array.isArray(x) ? x[0] : x);
const chunk = <T>(a: T[], n: number) =>
  Array.from({ length: Math.ceil(a.length / n) }, (_, i) =>
    a.slice(i * n, i * n + n),
  );
const must = (r: { error: any }) => {
  if (r.error) throw r.error;
};
function validPassword(value: string, expectedHash: string | null) {
  if (!expectedHash) return false;
  const actualHash = createHash("sha256").update(value).digest("hex");
  const actual = Buffer.from(actualHash);
  const expected = Buffer.from(expectedHash);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
const cancelKb = (l: Lang) => inline([[[t(l, "cancel"), "cancel"]]]);
const timeOf = (iso: string, tz: string) =>
  new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
const stampOf = (iso: string, tz: string) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));

async function setState(
  tg: number,
  state: string | null,
  data: Record<string, any> = {},
) {
  if (!state)
    must(
      await db.from("conversation_states").delete().eq("telegram_user_id", tg),
    );
  else
    must(
      await db.from("conversation_states").upsert({
        telegram_user_id: tg,
        state,
        data,
        updated_at: new Date().toISOString(),
      }),
    );
}

function amountOf(text: string, allowZero = false): bigint | null {
  try {
    const c = parseMoney(text);
    if (c < 0n || (!allowZero && c === 0n) || c > 99999999999n) return null;
    return c;
  } catch {
    return null;
  }
}

// ---------- entry point ----------
export async function handleUpdate(u: any) {
  const msg = u.message,
    cb = u.callback_query,
    from = (msg ?? cb)?.from,
    chat = (msg?.chat ?? cb?.message?.chat)?.id;
  if (!from || !chat || (msg && !msg.text && !msg.photo)) return;
  const ins = await db
    .from("telegram_updates")
    .insert({ update_id: u.update_id });
  if (ins.error) {
    if (ins.error.code === "23505") return;
    throw ins.error;
  } // duplicate delivery
  if (cb) await answer(cb.id);
  const tg: number = from.id,
    text: string | undefined = msg?.text?.trim(),
    photo: string | undefined = msg?.photo?.at(-1)?.file_id,
    data: string | undefined = cb?.data;
  let lang: Lang = "en";
  try {
    let { data: st } = await db
      .from("conversation_states")
      .select("state,data")
      .eq("telegram_user_id", tg)
      .maybeSingle();
    const { data: user } = await db
      .from("users")
      .select("id,name,language,last_login_at,password_hash")
      .eq("telegram_user_id", tg)
      .maybeSingle();
    if (!user) return await send(chat, t(lang, "notAllowed"), startKeyboard);
    const { data: mm } = await db
      .from("cafe_members")
      .select(
        "role,cafe_id,cafes(timezone,receptionist_can_close,owner_password_hash)",
      )
      .eq("user_id", user.id)
      .eq("active", true)
      .limit(1)
      .maybeSingle();
    if (!mm) return await send(chat, t(lang, "notAllowed"), startKeyboard);
    const cafe = one(mm.cafes) as any;
    const owner = mm.role === "OWNER";
    if (text === "/start") {
      await setState(tg, "LOGIN", {});
      return send(chat, t("en", "askPassword"), startKeyboard);
    }
    if (st?.state === "LOGIN") {
      const passwordHash = owner
        ? cafe.owner_password_hash
        : user.password_hash;
      if (!text || !validPassword(text, passwordHash))
        return send(chat, t("en", "badPassword"), startKeyboard);
      const loginAt = new Date().toISOString();
      must(
        await db
          .from("users")
          .update({ last_login_at: loginAt })
          .eq("id", user.id),
      );
      user.last_login_at = loginAt;
      await setState(tg, null);
      st = null;
    }
    if (
      !user.last_login_at ||
      new Date(user.last_login_at).getTime() < Date.now() - 12 * 60 * 60 * 1000
    ) {
      await setState(tg, "LOGIN", {});
      return send(chat, t("en", "askPassword"), startKeyboard);
    }
    lang = user.language;
    const m: M = {
      userId: user.id,
      name: user.name,
      cafeId: mm.cafe_id,
      role: mm.role,
      tz: cafe.timezone,
      canClose: cafe.receptionist_can_close,
      lang,
    };
    await dispatch(m, tg, chat, u.update_id, text, data, photo, st);
  } catch (e) {
    console.error("bot error", e);
    await send(chat, t(lang, "error")).catch(() => {});
  }
}

// ---------- registration ----------
async function register(
  tg: number,
  chat: number,
  text: string | undefined,
  data: string | undefined,
  st: St,
) {
  const s = st?.state,
    d = st?.data ?? {},
    l = (d.lang ?? "en") as Lang;
  if (data?.startsWith("lang:") && s === "REG_LANG") {
    const nl = data.slice(5) as Lang;
    if (!LANGS.includes(nl)) return;
    await setState(tg, "REG_NAME", { lang: nl });
    return send(chat, t(nl, "askName"));
  }
  if (data?.startsWith("role:") && s === "REG_ROLE") {
    const r = data.slice(5);
    if (r === "OWNER") {
      await setState(tg, "REG_CAFE", { ...d, role: r });
      return send(chat, t(l, "askCafe"));
    }
    if (r === "RECEPTIONIST") {
      await setState(tg, "REG_INVITE", { ...d, role: r });
      return send(chat, t(l, "askInvite"));
    }
    return;
  }
  if (text && s === "REG_NAME") {
    const p = z.string().trim().min(1).max(100).safeParse(text);
    if (!p.success) return send(chat, t(l, "askName"));
    await setState(tg, "REG_ROLE", { ...d, name: p.data });
    return send(
      chat,
      t(l, "askRole"),
      inline([
        [[t(l, "owner"), "role:OWNER"]],
        [[t(l, "recep"), "role:RECEPTIONIST"]],
      ]),
    );
  }
  if (text && s === "REG_INVITE") {
    const now = new Date().toISOString();
    const r = await db
      .from("invites")
      .select("cafe_id")
      .eq("code", text.toUpperCase())
      .is("used_at", null)
      .gt("expires_at", now)
      .maybeSingle();
    if (!r.data) return send(chat, t(l, "badInvite"));
    await setState(tg, "RECEPTION_PASSWORD", {
      ...d,
      cafeId: r.data.cafe_id,
      inviteCode: text.toUpperCase(),
    });
    return send(chat, t(l, "askReceptionPassword"));
  }
  if (text && s === "RECEPTION_PASSWORD") {
    const p = z.string().min(1).max(100).safeParse(text);
    if (!p.success) return send(chat, t(l, "askReceptionPassword"));
    const now = new Date().toISOString();
    const hash = createHash("sha256").update(p.data).digest("hex");
    const invite = await db
      .from("invites")
      .update({ used_at: now })
      .eq("code", d.inviteCode)
      .is("used_at", null)
      .gt("expires_at", now)
      .select("cafe_id")
      .maybeSingle();
    if (!invite.data) return send(chat, t(l, "badInvite"));
    const u = await db
      .from("users")
      .insert({
        telegram_user_id: tg,
        name: d.name,
        language: l,
        password_hash: hash,
        last_login_at: now,
      })
      .select("id")
      .single();
    must(u);
    must(
      await db.from("cafe_members").insert({
        cafe_id: invite.data.cafe_id,
        user_id: u.data!.id,
        role: d.role,
      }),
    );
    await setState(tg, null);
    return send(chat, `${t(l, "ready")}\n\n${t(l, "pick")}`, menuKeyboard(l));
  }
  if (text && s === "REG_CAFE") {
    const p = z.string().trim().min(1).max(100).safeParse(text);
    if (!p.success) return send(chat, t(l, "askCafe"));
    const r = await db
      .from("cafes")
      .insert({
        name: p.data,
        owner_telegram_id: d.ownerAuthenticated ? tg : null,
      })
      .select("id")
      .single();
    must(r);
    const cafeId = r.data!.id;
    const u = await db
      .from("users")
      .insert({
        telegram_user_id: tg,
        name: d.name,
        language: l,
        last_login_at: d.ownerAuthenticated ? new Date().toISOString() : null,
      })
      .select("id")
      .single();
    must(u);
    must(
      await db
        .from("cafe_members")
        .insert({ cafe_id: cafeId, user_id: u.data!.id, role: d.role }),
    );
    if (s === "REG_CAFE") {
      must(
        await db.from("payment_methods").insert([
          { cafe_id: cafeId, name: "Cash", type: "CASH" },
          { cafe_id: cafeId, name: "Telebirr", type: "TELEBIRR" },
          { cafe_id: cafeId, name: "CBE", type: "CBE" },
        ]),
      );
      must(
        await db.from("expense_categories").insert(
          [
            ["Milk", "🥛"],
            ["Sugar", "🍬"],
            ["Cleaning", "🧹"],
            ["Electricity", "⚡"],
            ["Supplies", "📦"],
            ["Other", "👤"],
          ].map(([name, emoji]) => ({ cafe_id: cafeId, name, emoji })),
        ),
      );
    }
    await setState(tg, null);
    return send(chat, `${t(l, "ready")}\n\n${t(l, "pick")}`, menuKeyboard(l));
  }
  await setState(tg, "REG_LANG", {});
  return send(
    chat,
    t("en", "welcome"),
    inline([
      [
        ["🇬🇧 English", "lang:en"],
        ["🇪🇹 አማርኛ", "lang:am"],
        ["🌍 Afaan Oromoo", "lang:om"],
      ],
    ]),
  );
}

// ---------- dispatch ----------
async function dispatch(
  m: M,
  tg: number,
  chat: number,
  uid: number,
  text: string | undefined,
  data: string | undefined,
  photo: string | undefined,
  st: St,
) {
  let act: string | null = null;
  if (text)
    act =
      text === "/cancel"
        ? "cancel"
        : text === "/start" || text === "/help"
          ? "menu"
          : menuAction(text);
  const alias: Record<string, string> = {
    cancel: "cancel",
    menu: "menu",
    txs: "tx",
    cash: "cash",
    reps: "reports",
  };
  if (data && alias[data]) act = alias[data];
  if (act) {
    await setState(tg, null);
    return action(m, tg, chat, act);
  }
  if (data) return callback(m, tg, chat, uid, data, st);
  if (photo && st?.state === "ITEM_PROOF") {
    const d: Record<string, any> = { ...st.data, proofFileId: photo };
    await setState(tg, "ITEM_CONFIRM", d);
    return send(
      chat,
      `${t(m.lang, "itemConfirm")}\n\n${d.itemName} × ${d.quantity}\n${t(m.lang, "amount")}: ${etb(BigInt(d.quantity) * BigInt(d.unitPrice))}\n${t(m.lang, "payment")}: ${d.pmName}`,
      inline([
        [
          [t(m.lang, "record"), "item:submit"],
          [t(m.lang, "cancel"), "cancel"],
        ],
      ]),
    );
  }
  if (text && st) return onText(m, tg, chat, uid, text, st);
  return action(m, tg, chat, "menu");
}

async function action(m: M, tg: number, chat: number, act: string) {
  const l = m.lang;
  switch (act) {
    case "cancel":
      return send(
        chat,
        `${t(l, "cancelled")}\n\n${t(l, "pick")}`,
        menuKeyboard(l, m.role, m.canClose),
      );
    case "menu":
      return send(chat, t(l, "pick"), menuKeyboard(l, m.role, m.canClose));
    case "sale":
      if (m.role !== "RECEPTIONIST") return send(chat, t(l, "notAllowed"));
      await setState(tg, "ITEM_NAME", {});
      return send(
        chat,
        head(t(l, "m_sale")) + t(l, "askItemName"),
        cancelKb(l),
      );
    case "in":
    case "out": {
      await setState(tg, "AMOUNT", {
        kind: act === "in" ? "INCOME" : "EXPENSE",
      });
      return send(
        chat,
        head(t(l, act === "in" ? "m_in" : "m_out")) +
          t(l, act === "in" ? "askIn" : "askOut"),
        cancelKb(l),
      );
    }
    case "today":
      return report(m, chat, "today");
    case "tx":
      return listTx(m, chat);
    case "cash":
      return showCash(m, tg, chat);
    case "close":
      return closeDay(m, tg, chat, false);
    case "reports":
      if (m.role !== "OWNER") return send(chat, t(l, "notAllowed"));
      return send(
        chat,
        head(t(l, "m_reports")),
        inline([
          [
            [t(l, "p_today"), "rep:today"],
            [t(l, "p_yest"), "rep:yest"],
          ],
          [
            [t(l, "p_week"), "rep:week"],
            [t(l, "p_month"), "rep:month"],
          ],
          [[t(l, "menuBtn"), "menu"]],
        ]),
      );
    case "items":
      if (m.role !== "OWNER") return send(chat, t(l, "notAllowed"));
      return itemSalesReport(m, chat);
    case "settings": {
      const rows: Rows = [
        [
          ["🇬🇧 English", "setlang:en"],
          ["🇪🇹 አማርኛ", "setlang:am"],
          ["🌍 Afaan Oromoo", "setlang:om"],
        ],
      ];
      if (m.role === "OWNER")
        rows.push(
          [[t(l, "inviteBtn"), "invite"]],
          [[t(l, "receptionBtn"), "receptions"]],
        );
      return send(
        chat,
        head(t(l, "m_settings")) + t(l, "chooseLang"),
        inline(rows),
      );
    }
  }
}

// ---------- callbacks ----------
async function callback(
  m: M,
  tg: number,
  chat: number,
  uid: number,
  data: string,
  st: St,
) {
  const l = m.lang,
    [k, ...r] = data.split(":"),
    v = r.join(":"),
    s = st?.state,
    d = st?.data ?? {};
  switch (k) {
    case "rep":
      return report(m, chat, v);
    case "sale_pm": {
      if (s !== "ITEM_PAY") return;
      const type = v === "BANK" ? "CBE" : v;
      if (!["CASH", "CBE", "TELEBIRR"].includes(type)) return;
      const { data: p } = await db
        .from("payment_methods")
        .select("id,name,type")
        .eq("cafe_id", m.cafeId)
        .eq("type", type)
        .eq("active", true)
        .maybeSingle();
      if (!p) return send(chat, t(l, "badPm"));
      const payment = {
        ...d,
        pm: p.id,
        pmName: v === "BANK" ? "🏦 Bank" : `${ico(p.type)} ${p.name}`,
        paymentType: v,
      };
      if (v !== "CASH") {
        await setState(tg, "ITEM_PROOF", payment);
        return send(chat, t(l, "askProof"), cancelKb(l));
      }
      await setState(tg, "ITEM_CONFIRM", payment);
      return send(
        chat,
        `${t(l, "itemConfirm")}\n\n${d.itemName} × ${d.quantity}\n${t(l, "amount")}: ${etb(BigInt(d.quantity) * BigInt(d.unitPrice))}\n${t(l, "payment")}: ${payment.pmName}`,
        inline([
          [
            [t(l, "record"), "item:submit"],
            [t(l, "cancel"), "cancel"],
          ],
        ]),
      );
    }
    case "pm": {
      if (s !== "PAY" && s !== "ITEM_PAY") return;
      if (v === "other") {
        await setState(tg, "OTHERNAME", d);
        return send(chat, t(l, "otherName"), cancelKb(l));
      }
      const { data: p } = await db
        .from("payment_methods")
        .select("id,name,type")
        .eq("id", v)
        .eq("cafe_id", m.cafeId)
        .eq("active", true)
        .maybeSingle();
      if (!p) return send(chat, t(l, "badPm"));
      if (s === "ITEM_PAY") {
        await setState(tg, "ITEM_CONFIRM", {
          ...d,
          pm: p.id,
          pmName: `${ico(p.type)} ${p.name}`,
        });
        return send(
          chat,
          `${t(l, "itemConfirm")}\n\n${d.itemName} × ${d.quantity}\n${t(l, "amount")}: ${etb(BigInt(d.quantity) * BigInt(d.unitPrice))}\n${t(l, "payment")}: ${p.name}`,
          inline([
            [
              [t(l, "record"), "item:submit"],
              [t(l, "cancel"), "cancel"],
            ],
          ]),
        );
      }
      return afterPay(m, tg, chat, uid, d, p);
    }
    case "note":
      if (s !== "NOTE") return;
      if (v === "add") {
        await setState(tg, "NOTETEXT", d);
        return send(chat, t(l, "typeNote"), cancelKb(l));
      }
      return saveTx(m, tg, chat, uid, d);
    case "item":
      if (s !== "ITEM_CONFIRM" || v !== "submit") return;
      return saveItem(m, tg, chat, uid, d);
    case "why":
      if (s !== "CASH_REASON") return;
      if (v === "OTHER") {
        await setState(tg, "CASH_NOTE", d);
        return send(chat, t(l, "typeNote"), cancelKb(l));
      }
      return saveRec(m, tg, chat, d, v, null);
    case "tx":
      return txDetail(m, chat, v);
    case "del": {
      const tx = await ownTx(m, v);
      if (!tx) return send(chat, t(l, "notAllowed"));
      return send(
        chat,
        t(l, "delAsk"),
        inline([
          [
            [t(l, "yes"), "delyes:" + v],
            [t(l, "cancel"), "txs"],
          ],
        ]),
      );
    }
    case "delyes": {
      const tx = await ownTx(m, v);
      if (!tx) return send(chat, t(l, "notAllowed"));
      must(
        await db
          .from("transactions")
          .update({ deleted_at: new Date().toISOString() })
          .eq("id", v)
          .eq("cafe_id", m.cafeId),
      );
      return send(chat, t(l, "deleted"));
    }
    case "close":
      return closeDay(m, tg, chat, true);
    case "reopen": {
      if (m.role !== "OWNER") return send(chat, t(l, "notAllowed"));
      must(
        await db
          .from("daily_closings")
          .update({
            reopened_by: m.userId,
            reopened_at: new Date().toISOString(),
          })
          .eq("cafe_id", m.cafeId)
          .eq("date", cafeLocalDate(new Date(), m.tz)),
      );
      return send(chat, t(l, "reopened"));
    }
    case "setlang": {
      if (!LANGS.includes(v as Lang)) return;
      must(await db.from("users").update({ language: v }).eq("id", m.userId));
      return send(
        chat,
        t(v as Lang, "langSet"),
        menuKeyboard(v as Lang, m.role, m.canClose),
      );
    }
    case "invite": {
      if (m.role !== "OWNER") return send(chat, t(l, "notAllowed"));
      const code = Array.from(
        { length: 6 },
        () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[randomInt(32)],
      ).join("");
      must(
        await db.from("invites").insert({
          code,
          cafe_id: m.cafeId,
          created_by: m.userId,
          expires_at: new Date(Date.now() + 864e5).toISOString(),
        }),
      );
      return send(chat, `${t(l, "invite")}\n${code}`);
    }
    case "receptions":
      if (m.role !== "OWNER") return send(chat, t(l, "notAllowed"));
      if (v === "add") {
        await setState(tg, "RECEPTION_ID", {});
        return send(chat, t(l, "askReceptionId"), cancelKb(l));
      }
      return showReceptionists(m, chat);
    case "member": {
      if (m.role !== "OWNER") return send(chat, t(l, "notAllowed"));
      const [operation, memberId] = v.split(":");
      if (
        !memberId ||
        !["activate", "deactivate", "delete"].includes(operation)
      )
        return;
      if (operation === "delete") {
        must(
          await db
            .from("cafe_members")
            .delete()
            .eq("id", memberId)
            .eq("cafe_id", m.cafeId)
            .eq("role", "RECEPTIONIST"),
        );
        await send(chat, t(l, "receptionDeleted"));
        return showReceptionists(m, chat);
      }
      must(
        await db
          .from("cafe_members")
          .update({ active: operation === "activate" })
          .eq("id", memberId)
          .eq("cafe_id", m.cafeId)
          .eq("role", "RECEPTIONIST"),
      );
      await send(chat, t(l, "receptionUpdated"));
      return showReceptionists(m, chat);
    }
  }
}

async function showReceptionists(m: M, chat: number) {
  if (m.role !== "OWNER") return send(chat, t(m.lang, "notAllowed"));
  const { data } = await db
    .from("cafe_members")
    .select("id,active,users(name,telegram_user_id)")
    .eq("cafe_id", m.cafeId)
    .eq("role", "RECEPTIONIST")
    .order("created_at");
  const rows: Rows = [];
  for (const member of data ?? []) {
    const user = one(member.users) as any;
    rows.push([
      [
        `${member.active ? "✅" : "⛔"} ${user?.name ?? "Unknown"} (${user?.telegram_user_id ?? "-"})`,
        `member:${member.active ? "deactivate" : "activate"}:${member.id}`,
      ],
      ["🗑️", `member:delete:${member.id}`],
    ]);
  }
  rows.push(
    [[t(m.lang, "addReception"), "receptions:add"]],
    [[t(m.lang, "menuBtn"), "menu"]],
  );
  return send(
    chat,
    head(t(m.lang, "receptionTitle")) +
      ((data ?? []).length === 0 ? t(m.lang, "receptionNone") : ""),
    inline(rows),
  );
}

// ---------- text steps ----------
async function onText(
  m: M,
  tg: number,
  chat: number,
  uid: number,
  text: string,
  st: NonNullable<St>,
) {
  const l = m.lang,
    d = st.data;
  switch (st.state) {
    case "RECEPTION_ID": {
      if (m.role !== "OWNER") return send(chat, t(l, "notAllowed"));
      const p = z.coerce.number().int().positive().safeParse(text);
      if (!p.success) return send(chat, t(l, "askReceptionId"), cancelKb(l));
      await setState(tg, "RECEPTION_NAME", { telegramId: p.data });
      return send(chat, t(l, "askReceptionName"), cancelKb(l));
    }
    case "RECEPTION_NAME": {
      if (m.role !== "OWNER") return send(chat, t(l, "notAllowed"));
      const p = z.string().trim().min(1).max(100).safeParse(text);
      if (!p.success) return send(chat, t(l, "askReceptionName"), cancelKb(l));
      await setState(tg, "RECEPTION_PASSWORD", { ...d, name: p.data });
      return send(chat, t(l, "askReceptionPassword"), cancelKb(l));
    }
    case "RECEPTION_PASSWORD": {
      if (m.role !== "OWNER") return send(chat, t(l, "notAllowed"));
      const p = z.string().min(1).max(100).safeParse(text);
      if (!p.success)
        return send(chat, t(l, "askReceptionPassword"), cancelKb(l));
      const hash = createHash("sha256").update(p.data).digest("hex");
      const userResult = await db
        .from("users")
        .upsert(
          { telegram_user_id: d.telegramId, name: d.name, password_hash: hash },
          { onConflict: "telegram_user_id" },
        )
        .select("id")
        .single();
      must(userResult);
      const userId = userResult.data?.id;
      if (!userId) throw new Error("RECEPTIONIST_USER_NOT_CREATED");
      const { data: existing } = await db
        .from("cafe_members")
        .select("id,role")
        .eq("cafe_id", m.cafeId)
        .eq("user_id", userId)
        .maybeSingle();
      if (existing?.role === "OWNER") return send(chat, t(l, "notAllowed"));
      if (existing)
        must(
          await db
            .from("cafe_members")
            .update({ role: "RECEPTIONIST", active: true })
            .eq("id", existing.id),
        );
      else
        must(
          await db.from("cafe_members").insert({
            cafe_id: m.cafeId,
            user_id: userId,
            role: "RECEPTIONIST",
            active: true,
          }),
        );
      await setState(tg, null);
      await send(chat, t(l, "receptionAdded"));
      return showReceptionists(m, chat);
    }
    case "ITEM_NAME": {
      const p = z.string().trim().min(1).max(100).safeParse(text);
      if (!p.success) return send(chat, t(l, "askItemName"), cancelKb(l));
      await setState(tg, "ITEM_QUANTITY", { itemName: p.data });
      return send(chat, t(l, "askQuantity"), cancelKb(l));
    }
    case "ITEM_QUANTITY": {
      const p = z.coerce
        .number()
        .int()
        .min(1)
        .max(100000)
        .safeParse(text.replace(/,/g, ""));
      if (!p.success) return send(chat, t(l, "askQuantity"), cancelKb(l));
      await setState(tg, "ITEM_PRICE", { ...d, quantity: p.data });
      return send(chat, t(l, "askUnitPrice"), cancelKb(l));
    }
    case "ITEM_PRICE": {
      const price = amountOf(text);
      if (price === null) return send(chat, t(l, "badAmt"), cancelKb(l));
      await setState(tg, "ITEM_PAY", { ...d, unitPrice: price.toString() });
      return askSalePay(m, chat);
    }
    case "AMOUNT": {
      const a = amountOf(text);
      if (a === null) return send(chat, t(l, "badAmt"), cancelKb(l));
      const nd = { ...d, amount: a.toString() };
      if (d.kind === "INCOME") {
        await setState(tg, "PAY", nd);
        return askPay(m, chat);
      }
      await setState(tg, "EXPENSE_NOTE", nd);
      return send(chat, head(t(l, "m_out")) + t(l, "askSpent"), cancelKb(l));
    }
    case "EXPENSE_NOTE": {
      const p = z.string().trim().min(1).max(300).safeParse(text);
      if (!p.success) return send(chat, t(l, "askSpent"), cancelKb(l));
      await setState(tg, "PAY", { ...d, note: p.data });
      return askPay(m, chat);
    }
    case "OTHERNAME": {
      const p = z.string().trim().min(1).max(50).safeParse(text);
      if (!p.success) return send(chat, t(l, "otherName"), cancelKb(l));
      let { data: pm } = await db
        .from("payment_methods")
        .select("id,name,type,active")
        .eq("cafe_id", m.cafeId)
        .eq("name", p.data)
        .maybeSingle();
      if (pm && !pm.active) return send(chat, t(l, "badPm"));
      if (!pm) {
        const r = await db
          .from("payment_methods")
          .insert({ cafe_id: m.cafeId, name: p.data, type: "OTHER" })
          .select("id,name,type,active")
          .single();
        must(r);
        pm = r.data;
      }
      return afterPay(m, tg, chat, uid, d, pm);
    }
    case "NOTETEXT": {
      const p = z.string().trim().min(1).max(300).safeParse(text);
      if (!p.success) return send(chat, t(l, "typeNote"), cancelKb(l));
      return saveTx(m, tg, chat, uid, { ...d, note: p.data });
    }
    case "CASH_ACTUAL": {
      const a = amountOf(text, true);
      if (a === null) return send(chat, t(l, "badAmt"), cancelKb(l));
      const nd = { ...d, actual: a.toString() };
      await setState(tg, "DIGITAL_ACTUAL", nd);
      return send(
        chat,
        `${t(l, "actual")}: ${etb(a)}\n\n${t(l, "askDigital")}`,
        cancelKb(l),
      );
    }
    case "DIGITAL_ACTUAL": {
      const a = amountOf(text, true);
      if (a === null) return send(chat, t(l, "badAmt"), cancelKb(l));
      const exp = BigInt(d.expected),
        actual = BigInt(d.actual),
        digitalExpected = BigInt(d.digitalExpected),
        cashDiff = calculateCashDifference(exp, actual),
        digitalDiff = calculateCashDifference(digitalExpected, a),
        nd = { ...d, actualDigital: a.toString() };
      if (cashDiff === 0n && digitalDiff === 0n)
        return saveRec(m, tg, chat, nd, "NONE", null);
      await setState(tg, "CASH_REASON", nd);
      const body = `${t(l, "expected")}:\n${etb(exp)}\n${t(l, "actual")}:\n${etb(actual)}\n${t(l, "diff")}:\n${cashDiff > 0n ? "+" : ""}${etb(cashDiff)}\n\n${t(l, "digitalExpected")}:\n${etb(digitalExpected)}\n${t(l, "digitalActual")}:\n${etb(a)}\n${t(l, "digitalDiff")}:\n${digitalDiff > 0n ? "+" : ""}${etb(digitalDiff)}\n\n${t(l, "why")}`;
      const R = [
        ["EXPENSE_NOT_RECORDED", "r1"],
        ["REFUND", "r2"],
        ["CASH_MISTAKE", "r3"],
        ["OTHER", "r4"],
        ["NONE", "r5"],
      ];
      return send(
        chat,
        head(t(l, "diffT")) + body,
        inline(R.map(([c, k]): [string, string][] => [[t(l, k), "why:" + c]])),
      );
    }
    case "CASH_NOTE": {
      const p = z.string().trim().min(1).max(300).safeParse(text);
      if (!p.success) return send(chat, t(l, "typeNote"), cancelKb(l));
      return saveRec(m, tg, chat, d, "OTHER", p.data);
    }
    default:
      return action(m, tg, chat, "menu");
  }
}

// ---------- income / expense ----------
async function askPay(m: M, chat: number) {
  const { data } = await db
    .from("payment_methods")
    .select("id,name,type")
    .eq("cafe_id", m.cafeId)
    .eq("active", true)
    .order("created_at");
  const b: [string, string][] = (data ?? []).map((p: any) => [
    `${ico(p.type)} ${p.name}`,
    "pm:" + p.id,
  ]);
  b.push([`🏦 ${t(m.lang, "other")}`, "pm:other"]);
  const rows = chunk(b, 2);
  rows.push([[t(m.lang, "cancel"), "cancel"]]);
  return send(
    chat,
    head(t(m.lang, "payT")) + t(m.lang, "askPay"),
    inline(rows),
  );
}

async function askSalePay(m: M, chat: number) {
  return send(
    chat,
    head(t(m.lang, "payT")) + t(m.lang, "askSalePay"),
    inline([
      [[t(m.lang, "cash"), "sale_pm:CASH"]],
      [[t(m.lang, "bank"), "sale_pm:BANK"]],
      [[t(m.lang, "telebirr"), "sale_pm:TELEBIRR"]],
      [[t(m.lang, "cancel"), "cancel"]],
    ]),
  );
}

async function afterPay(
  m: M,
  tg: number,
  chat: number,
  uid: number,
  d: any,
  p: any,
) {
  const payment = {
    ...d,
    pm: p.id,
    pmName: `${ico(p.type)} ${p.name}`,
  };
  if (d.kind === "EXPENSE") return saveTx(m, tg, chat, uid, payment);
  await setState(tg, "NOTE", payment);
  return send(
    chat,
    t(m.lang, "askNote"),
    inline([
      [
        [t(m.lang, "addNote"), "note:add"],
        [t(m.lang, "skip"), "note:skip"],
      ],
    ]),
  );
}

async function saveTx(m: M, tg: number, chat: number, uid: number, d: any) {
  const r = await db
    .from("transactions")
    .insert({
      cafe_id: m.cafeId,
      user_id: m.userId,
      type: d.kind,
      amount: dec(BigInt(d.amount)),
      payment_method_id: d.pm,
      category_id: d.cat ?? null,
      note: d.note ?? null,
      telegram_update_id: uid,
    })
    .select("created_at")
    .maybeSingle();
  if (r.error && r.error.code !== "23505") throw r.error;
  await setState(tg, null);
  const l = m.lang,
    now = r.data?.created_at ?? new Date().toISOString();
  const body =
    `${t(l, "amount")}:\n${etb(BigInt(d.amount))}\n\n` +
    (d.note ? `${t(l, "note")}:\n${d.note}\n\n` : "") +
    `${t(l, "payment")}:\n${d.pmName}\n\n${t(l, "time")}:\n${timeOf(now, m.tz)}`;
  return send(
    chat,
    head(t(l, d.kind === "INCOME" ? "incRec" : "expRec")) + body,
    menuKeyboard(l, m.role, m.canClose),
  );
}

async function saveItem(m: M, tg: number, chat: number, uid: number, d: any) {
  const total = BigInt(d.quantity) * BigInt(d.unitPrice);
  const r = await db
    .from("transactions")
    .insert({
      cafe_id: m.cafeId,
      user_id: m.userId,
      type: "INCOME",
      amount: dec(total),
      payment_method_id: d.pm,
      payment_proof_file_id: d.proofFileId ?? null,
      item_name: d.itemName,
      quantity: d.quantity,
      unit_price: dec(BigInt(d.unitPrice)),
      telegram_update_id: uid,
    })
    .select("created_at")
    .maybeSingle();
  if (r.error && r.error.code !== "23505") throw r.error;
  await setState(tg, null);
  return send(
    chat,
    `${t(m.lang, "itemRecorded")}\n\n${d.itemName} × ${d.quantity}\n${t(m.lang, "amount")}: ${etb(total)}\n${t(m.lang, "payment")}: ${d.pmName}`,
    menuKeyboard(m.lang, m.role, m.canClose),
  );
}

// ---------- reports ----------
function range(key: string, tz: string): [string, string] {
  const today = cafeLocalDate(new Date(), tz),
    d = new Date(today + "T00:00:00Z"),
    iso = (x: Date) => x.toISOString().slice(0, 10);
  if (key === "yest") {
    d.setUTCDate(d.getUTCDate() - 1);
    return [iso(d), iso(d)];
  }
  if (key === "week") {
    d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
    return [iso(d), today];
  }
  if (key === "month") return [today.slice(0, 8) + "01", today];
  return [today, today];
}

async function loadTxs(m: M, from: string, to: string) {
  const lo = new Date(
    new Date(from + "T00:00:00Z").getTime() - 864e5,
  ).toISOString();
  const hi = new Date(
    new Date(to + "T00:00:00Z").getTime() + 2 * 864e5,
  ).toISOString();
  const rows: any[] = [];
  for (let p = 0; ; p++) {
    const { data, error } = await db
      .from("transactions")
      .select("id,type,amount,created_at,payment_methods(id,name,type)")
      .eq("cafe_id", m.cafeId)
      .is("deleted_at", null)
      .gte("created_at", lo)
      .lte("created_at", hi)
      .order("created_at")
      .order("id")
      .range(p * 1000, p * 1000 + 999);
    if (error) throw error;
    rows.push(...data);
    if (data.length < 1000) break;
  }
  return rows
    .filter((r) => {
      const x = cafeLocalDate(new Date(r.created_at), m.tz);
      return x >= from && x <= to;
    })
    .map((r) => ({ ...r, payment_methods: one(r.payment_methods) }));
}
const toTx = (r: any): Tx => ({
  type: r.type,
  amount: r.amount,
  methodId: r.payment_methods.id,
  methodType: r.payment_methods.type,
});

async function report(m: M, chat: number, key: string) {
  if (m.role !== "OWNER" || !["today", "yest", "week", "month"].includes(key))
    return send(chat, t(m.lang, "notAllowed"));
  const l = m.lang,
    [from, to] = range(key, m.tz),
    rows = await loadTxs(m, from, to),
    txs = rows.map(toTx);
  const names = new Map<string, string>();
  rows.forEach((r) =>
    names.set(
      r.payment_methods.id,
      `${ico(r.payment_methods.type)} ${r.payment_methods.name}`,
    ),
  );
  const lines = [...calculatePaymentBreakdown(txs)]
    .map(([id, c]) => `${names.get(id)}\n${etb(c)}`)
    .join("\n\n");
  const text =
    `${LINE}\n${t(l, key === "today" ? "todayT" : "repT")}\n${t(l, "p_" + key)} · ${from === to ? from : `${from} → ${to}`}\n${LINE}\n\n${t(l, "income")}\n\n${lines ? lines + "\n\n" : ""}` +
    `${LINE}\n${t(l, "totalIncome")}\n${etb(calculateIncome(txs))}\n${LINE}\n\n${t(l, "expenses")}\n${etb(calculateExpenses(txs))}\n\n` +
    `${LINE}\n${t(l, "net")}\n${etb(calculateNetIncome(txs))}\n${LINE}\n\n${t(l, "count")}: ${txs.length}`;
  const rows2: Rows =
    key === "today"
      ? [
          [
            [t(l, "refresh"), "rep:today"],
            [t(l, "m_tx"), "txs"],
          ],
          [
            [t(l, "m_cash"), "cash"],
            [t(l, "otherDate"), "reps"],
          ],
          [[t(l, "menuBtn"), "menu"]],
        ]
      : [
          [
            [t(l, "refresh"), "rep:" + key],
            [t(l, "otherDate"), "reps"],
          ],
          [[t(l, "menuBtn"), "menu"]],
        ];
  return send(chat, text, inline(rows2));
}

async function itemSalesReport(m: M, chat: number) {
  const { data, error } = await db
    .from("transactions")
    .select("item_name,quantity,amount")
    .eq("cafe_id", m.cafeId)
    .eq("type", "INCOME")
    .is("deleted_at", null)
    .not("item_name", "is", null);
  if (error) throw error;
  const totals = new Map<string, { quantity: number; amount: bigint }>();
  for (const row of data ?? []) {
    const current = totals.get(row.item_name) ?? { quantity: 0, amount: 0n };
    current.quantity += Number(row.quantity ?? 0);
    current.amount += parseMoney(String(row.amount));
    totals.set(row.item_name, current);
  }
  const lines = [...totals.entries()]
    .sort((a, b) => b[1].quantity - a[1].quantity)
    .map(
      ([name, value], index) =>
        `${index + 1}. ${name} — ${value.quantity} ${t(m.lang, "sold")} (${etb(value.amount)})`,
    )
    .join("\n");
  return send(
    chat,
    head(t(m.lang, "itemReport")) + (lines || t(m.lang, "none")),
    inline([
      [
        [t(m.lang, "refresh"), "items"],
        [t(m.lang, "menuBtn"), "menu"],
      ],
    ]),
  );
}

// ---------- cash reconciliation ----------
async function showCash(m: M, tg: number, chat: number) {
  const l = m.lang,
    today = cafeLocalDate(new Date(), m.tz),
    txs = (await loadTxs(m, today, today)).map(toTx);
  const cash = txs.filter((x) => x.methodType === "CASH"),
    bank = txs.filter((x) => x.methodType === "CBE"),
    telebirr = txs.filter((x) => x.methodType === "TELEBIRR"),
    exp = calculateExpectedCash(txs),
    digitalExpected = calculateIncome(bank) + calculateIncome(telebirr);
  await setState(tg, "CASH_ACTUAL", {
    expected: exp.toString(),
    digitalExpected: digitalExpected.toString(),
    date: today,
  });
  return send(
    chat,
    head(t(l, "cashT")) +
      `${t(l, "cashIn")}:\n${etb(calculateIncome(cash))}\n\n${t(l, "cashOut")}:\n${etb(calculateExpenses(cash))}\n\n${t(l, "expected")}:\n${etb(exp)}\n\n${t(l, "bankTotal")}:\n${etb(calculateIncome(bank))}\n\n${t(l, "telebirrTotal")}:\n${etb(calculateIncome(telebirr))}\n\n${t(l, "askActual")}`,
    cancelKb(l),
  );
}

async function saveRec(
  m: M,
  tg: number,
  chat: number,
  d: any,
  reason: string,
  note: string | null,
) {
  const exp = BigInt(d.expected),
    act = BigInt(d.actual),
    diff = calculateCashDifference(exp, act);
  const { data: prev } = await db
    .from("cash_reconciliations")
    .select("id")
    .eq("cafe_id", m.cafeId)
    .eq("date", d.date)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  must(
    await db.from("cash_reconciliations").insert({
      cafe_id: m.cafeId,
      user_id: m.userId,
      date: d.date,
      expected_cash: dec(exp),
      actual_cash: dec(act),
      difference: dec(diff),
      expected_digital: d.digitalExpected
        ? dec(BigInt(d.digitalExpected))
        : null,
      actual_digital: d.actualDigital ? dec(BigInt(d.actualDigital)) : null,
      digital_difference: d.actualDigital
        ? dec(
            calculateCashDifference(
              BigInt(d.digitalExpected ?? "0"),
              BigInt(d.actualDigital),
            ),
          )
        : null,
      reason,
      note,
      supersedes_id: prev?.id ?? null, // append-only history
    }),
  );
  await setState(tg, null);
  const l = m.lang;
  return send(
    chat,
    head(t(l, diff === 0n ? "okT" : "diffT")) +
      `${t(l, "expected")}: ${etb(exp)}\n${t(l, "actual")}: ${etb(act)}\n${t(l, "diff")}: ${etb(diff)}\n` +
      (d.digitalExpected
        ? `\n${t(l, "digitalExpected")}: ${etb(BigInt(d.digitalExpected))}\n${t(l, "digitalActual")}: ${etb(BigInt(d.actualDigital ?? "0"))}\n${t(l, "digitalDiff")}: ${etb(calculateCashDifference(BigInt(d.digitalExpected), BigInt(d.actualDigital ?? "0")))}\n`
        : "") +
      `\n${t(l, "saved")}`,
    menuKeyboard(l, m.role, m.canClose),
  );
}

// ---------- daily closing ----------
async function closeDay(m: M, tg: number, chat: number, confirm: boolean) {
  const l = m.lang,
    today = cafeLocalDate(new Date(), m.tz);
  const { data: ex } = await db
    .from("daily_closings")
    .select("*")
    .eq("cafe_id", m.cafeId)
    .eq("date", today)
    .maybeSingle();
  const body = (inc: bigint, exp: bigint, net: bigint, cash: bigint) =>
    `${t(l, "lIncome")}:\n${etb(inc)}\n\n${t(l, "lExpenses")}:\n${etb(exp)}\n\n${t(l, "lNet")}:\n${etb(net)}\n\n${t(l, "expected")}:\n${etb(cash)}`;
  if (ex && !ex.reopened_at) {
    const c = (x: string) => parseMoney(String(x));
    return send(
      chat,
      head(t(l, "closeT")) +
        `${t(l, "closed")}\n\n` +
        body(
          c(ex.total_income),
          c(ex.total_expenses),
          c(ex.net),
          c(ex.expected_cash),
        ),
      m.role === "OWNER"
        ? inline([[[t(l, "reopenBtn"), "reopen"]]])
        : undefined,
    );
  }
  if (m.role !== "OWNER" && !m.canClose) return send(chat, t(l, "notAllowed"));
  const txs = (await loadTxs(m, today, today)).map(toTx);
  const inc = calculateIncome(txs),
    exp = calculateExpenses(txs),
    net = calculateNetIncome(txs),
    cash = calculateExpectedCash(txs);
  if (!confirm)
    return send(
      chat,
      head(t(l, "closeT")) +
        body(inc, exp, net, cash) +
        `\n\n${t(l, "closeAsk")}`,
      inline([
        [
          [t(l, "closeBtn"), "close:yes"],
          [t(l, "menuBtn"), "menu"],
        ],
      ]),
    );
  const row = {
    closed_by: m.userId,
    total_income: dec(inc),
    total_expenses: dec(exp),
    net: dec(net),
    expected_cash: dec(cash),
    reopened_by: null,
    reopened_at: null,
  };
  const r = ex
    ? await db
        .from("daily_closings")
        .update({ ...row, created_at: new Date().toISOString() })
        .eq("id", ex.id)
        .eq("cafe_id", m.cafeId)
    : await db
        .from("daily_closings")
        .insert({ ...row, cafe_id: m.cafeId, date: today });
  if (r.error && r.error.code !== "23505") throw r.error;
  if (m.role === "RECEPTIONIST") {
    await db.from("users").update({ last_login_at: null }).eq("id", m.userId);
    await setState(tg, null);
    return send(
      chat,
      head(t(l, "closedOk")) +
        body(inc, exp, net, cash) +
        `\n\n${t(l, "closeRestart")}`,
      startKeyboard,
    );
  }
  return send(
    chat,
    head(t(l, "closedOk")) + body(inc, exp, net, cash),
    menuKeyboard(l, m.role, m.canClose),
  );
}

// ---------- transactions ----------
async function listTx(m: M, chat: number) {
  const l = m.lang;
  const { data } = await db
    .from("transactions")
    .select(
      "id,type,amount,created_at,payment_methods(name,type),expense_categories(name,emoji)",
    )
    .eq("cafe_id", m.cafeId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(8);
  if (!data?.length) return send(chat, t(l, "none"));
  const lines = data
    .map((r: any, i: number) => {
      const pm = one(r.payment_methods),
        cat = one(r.expense_categories);
      return `${i + 1}. ${r.type === "INCOME" ? "💰 +" : "💸 -"}${etb(parseMoney(String(r.amount)))}\n${pm.name}${cat ? " · " + cat.name : ""}\n${stampOf(r.created_at, m.tz)}`;
    })
    .join("\n\n");
  const rows: Rows = chunk(
    data.map((r: any, i: number): [string, string] => [
      String(i + 1),
      "tx:" + r.id,
    ]),
    4,
  );
  rows.push([[t(l, "menuBtn"), "menu"]]);
  return send(chat, head(t(l, "recent")) + lines, inline(rows));
}

async function ownTx(m: M, id: string) {
  // cafe isolation + permission check on every access
  const { data } = await db
    .from("transactions")
    .select("id,user_id")
    .eq("id", id)
    .eq("cafe_id", m.cafeId)
    .is("deleted_at", null)
    .maybeSingle();
  return data && (m.role === "OWNER" || data.user_id === m.userId)
    ? data
    : null;
}

async function txDetail(m: M, chat: number, id: string) {
  const l = m.lang;
  const { data: r } = await db
    .from("transactions")
    .select(
      "id,type,amount,note,created_at,user_id,payment_methods(name,type),expense_categories(name,emoji),users(name)",
    )
    .eq("id", id)
    .eq("cafe_id", m.cafeId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!r) return send(chat, t(l, "notAllowed"));
  const pm = one(r.payment_methods),
    cat = one(r.expense_categories),
    usr = one(r.users);
  const text =
    head(t(l, "details")) +
    `${t(l, "amount")}:\n${etb(parseMoney(String(r.amount)))}\n\n${t(l, "type")}:\n${t(l, r.type === "INCOME" ? "income" : "expenses")}\n\n${t(l, "payment")}:\n${ico(pm.type)} ${pm.name}\n\n` +
    (cat ? `${t(l, "category")}:\n${cat.emoji ?? ""} ${cat.name}\n\n` : "") +
    (r.note ? `${t(l, "note")}:\n${r.note}\n\n` : "") +
    `${t(l, "by")}:\n${usr?.name ?? "-"}\n\n${t(l, "date")}:\n${stampOf(r.created_at, m.tz)}`;
  const can = m.role === "OWNER" || r.user_id === m.userId;
  return send(
    chat,
    text,
    inline([
      ...(can ? [[[t(l, "delBtn"), "del:" + r.id]] as [string, string][]] : []),
      [[t(l, "menuBtn"), "menu"]],
    ]),
  );
}
