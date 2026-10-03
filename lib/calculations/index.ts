// Money is handled as BigInt "cents" (2 decimals). No floating point anywhere.
// Telegram and the dashboard both import these functions.

export type Money = bigint; // cents
export type TxType = "INCOME" | "EXPENSE";
export type MethodType = "CASH" | "TELEBIRR" | "CBE" | "OTHER";

export interface Tx {
  type: TxType;
  amount: string | number; // numeric value or string from Postgres, e.g. "100.50"
  methodId: string;
  methodType: MethodType;
}

/** Parse "100.5" / "1,000.25" into cents. Throws on invalid, non-positive-safe parsing is caller's job. */
export function parseMoney(input: string | number): Money {
  const s = String(input).trim().replace(/,/g, "");
  if (!/^-?\d+(\.\d{1,2})?$/.test(s)) throw new Error("INVALID_AMOUNT");
  const neg = s.startsWith("-");
  const [whole, frac = ""] = s.replace("-", "").split(".");
  const cents = BigInt(whole) * 100n + BigInt(frac.padEnd(2, "0"));
  return neg ? -cents : cents;
}

/** Format cents as "8,450" or "8,450.25" (no trailing .00). */
export function formatMoney(m: Money): string {
  const neg = m < 0n;
  const abs = neg ? -m : m;
  const whole = (abs / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const frac = (abs % 100n).toString().padStart(2, "0");
  return `${neg ? "-" : ""}${whole}${frac === "00" ? "" : "." + frac}`;
}

const sum = (
  txs: Tx[],
  type: TxType,
  pred: (t: Tx) => boolean = () => true,
): Money =>
  txs
    .filter((t) => t.type === type && pred(t))
    .reduce((a, t) => a + parseMoney(t.amount), 0n);

export const calculateIncome = (txs: Tx[]): Money => sum(txs, "INCOME");
export const calculateExpenses = (txs: Tx[]): Money => sum(txs, "EXPENSE");
export const calculateNetIncome = (txs: Tx[]): Money =>
  calculateIncome(txs) - calculateExpenses(txs);

/** Income per payment method. Expenses are never counted. */
export function calculatePaymentBreakdown(txs: Tx[]): Map<string, Money> {
  const out = new Map<string, Money>();
  for (const t of txs) {
    if (t.type !== "INCOME") continue;
    out.set(t.methodId, (out.get(t.methodId) ?? 0n) + parseMoney(t.amount));
  }
  return out;
}

/** Physical cash only: cash income - cash expenses. Digital methods never affect it. */
export function calculateExpectedCash(txs: Tx[]): Money {
  const isCash = (t: Tx) => t.methodType === "CASH";
  return sum(txs, "INCOME", isCash) - sum(txs, "EXPENSE", isCash);
}

export const calculateCashDifference = (
  expected: Money,
  actual: Money,
): Money => actual - expected;

export function calculatePeriodReport(txs: Tx[]) {
  return {
    income: calculateIncome(txs),
    expenses: calculateExpenses(txs),
    net: calculateNetIncome(txs),
    breakdown: calculatePaymentBreakdown(txs),
    expectedCash: calculateExpectedCash(txs),
    count: txs.length,
  };
}

/** Business date (YYYY-MM-DD) in the cafe's timezone, so UTC midnight never shifts "today". */
export function cafeLocalDate(d: Date, tz = "Africa/Addis_Ababa"): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}
