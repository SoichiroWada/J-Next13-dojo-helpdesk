import type { Timestamp } from "firebase/firestore";
import { describe, expect, it } from "vitest";
import { formatTokyoDateTime } from "@/utils/date";

// Only the toDate contract is needed; no Firebase runtime or connection.
const timestamp = (iso: string) => ({ toDate: () => new Date(iso) }) as Timestamp;

describe("Ticket date formatting", () => {
  it.each([
    ["2026-10-21T03:04:05.987Z", "2026/10/21 12:04:05"],
    ["2026-10-21T14:59:59Z", "2026/10/21 23:59:59"],
    ["2026-10-21T15:00:00Z", "2026/10/22 00:00:00"],
    ["2026-12-31T15:00:00Z", "2027/01/01 00:00:00"],
    ["2024-02-28T15:00:00Z", "2024/02/29 00:00:00"],
    ["1970-01-01T00:00:00Z", "1970/01/01 09:00:00"],
    ["2026-06-01T12:00:00-07:00", "2026/06/02 04:00:00"],
  ])("formats %s in Tokyo with seconds and a 24-hour clock", (iso, expected) => {
    expect(formatTokyoDateTime(timestamp(iso))).toBe(expected);
  });

  it("uses Just now for an omitted or unresolved timestamp", () => {
    expect(formatTokyoDateTime()).toBe("Just now");
    expect(formatTokyoDateTime(null)).toBe("Just now");
  });

  it.each([{}, { seconds: 0, nanoseconds: 0 }, { toDate: null }, { toDate: "invalid" }, "invalid", 0])(
    "uses Just now for malformed input without a callable toDate: %j",
    (value) => {
      expect(formatTokyoDateTime(value as unknown as Timestamp)).toBe("Just now");
    },
  );

  it("preserves the existing RangeError for an invalid Date", () => {
    expect(() => formatTokyoDateTime(timestamp("invalid"))).toThrow(RangeError);
  });

  it("propagates a toDate failure instead of hiding it as an unresolved timestamp", () => {
    const error = new Error("Invalid timestamp");
    const value = { toDate: () => { throw error; } } as unknown as Timestamp;
    expect(() => formatTokyoDateTime(value)).toThrow(error);
  });
});
