import { describe, it, expect } from "vitest";
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
} from "../lib/calculations";

const tx = (
  type: Tx["type"],
  amount: string,
  methodType: Tx["methodType"],
): Tx => ({
  type,
  amount,
  methodType,
  methodId: methodType.toLowerCase(),
});

const day: Tx[] = [
  tx("INCOME", "1000", "CASH"),
  tx("INCOME", "500", "TELEBIRR"),
  tx("INCOME", "300", "CBE"),
  tx("EXPENSE", "200", "CASH"),
];

describe("money", () => {
  it("has no floating point error", () => {
    expect(parseMoney("100.50") + parseMoney("200.25")).toBe(
      parseMoney("300.75"),
    );
    expect(parseMoney(100.5)).toBe(parseMoney("100.50"));
    expect(formatMoney(parseMoney("300.75"))).toBe("300.75");
    expect(formatMoney(parseMoney("14000"))).toBe("14,000");
  });
  it("rejects invalid input", () => {
    for (const bad of ["abc", "1.234", "", "1e5", "--2"])
      expect(() => parseMoney(bad)).toThrow();
  });
});

describe("daily totals", () => {
  it("income, expenses, net", () => {
    expect(calculateIncome(day)).toBe(180000n);
    expect(calculateExpenses(day)).toBe(20000n);
    expect(calculateNetIncome(day)).toBe(160000n);
  });
  it("expected cash ignores digital payments (800, not 1600)", () => {
    expect(calculateExpectedCash(day)).toBe(80000n);
  });
  it("cash difference", () => {
    expect(calculateCashDifference(72500n, 70000n)).toBe(-2500n);
  });
  it("payment breakdown excludes expenses", () => {
    const b = calculatePaymentBreakdown(day);
    expect(b.get("cash")).toBe(100000n);
    expect(b.get("telebirr")).toBe(50000n);
    expect(b.get("cbe")).toBe(30000n);
  });
  it("digital expense does not change cash", () => {
    expect(
      calculateExpectedCash([...day, tx("EXPENSE", "999", "TELEBIRR")]),
    ).toBe(80000n);
  });
});

describe("dates", () => {
  it("21:30 UTC is already the next day in Addis Ababa (UTC+3)", () => {
    expect(cafeLocalDate(new Date("2026-09-30T21:30:00Z"))).toBe("2026-10-01");
  });
});
