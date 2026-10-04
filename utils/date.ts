import type { Timestamp } from "firebase/firestore";

const tokyoDateTime = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

export function formatTokyoDateTime(timestamp: Timestamp): string {
  return tokyoDateTime.format(timestamp.toDate());
}
