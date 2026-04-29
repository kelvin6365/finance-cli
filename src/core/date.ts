const MS_PER_DAY = 86_400_000;

const parseYmd = (ymd: string): number => {
  const [y, m, d] = ymd.split("-").map(Number) as [number, number, number];
  return Date.UTC(y, m - 1, d);
};

const pad2 = (n: number): string => (n < 10 ? `0${n}` : `${n}`);

export const today = (now: Date = new Date()): string => {
  const y = now.getFullYear();
  const m = pad2(now.getMonth() + 1);
  const d = pad2(now.getDate());
  return `${y}-${m}-${d}`;
};

export const currentMonth = (now: Date = new Date()): string => {
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`;
};

export const daysBetween = (a: string, b: string): number => {
  return Math.round((parseYmd(b) - parseYmd(a)) / MS_PER_DAY);
};

export const daysInMonth = (ym: string): number => {
  const [y, m] = ym.split("-").map(Number) as [number, number];
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
};

export const ymOf = (ymd: string): string => ymd.slice(0, 7);

export const lastDayOfMonthAfter = (ymd: string, monthsAhead: number): string => {
  const [y, m] = ymd.split("-").map(Number) as [number, number];
  const total = (y * 12 + (m - 1)) + monthsAhead;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  const last = new Date(Date.UTC(ny, nm, 0)).getUTCDate();
  return `${ny}-${pad2(nm)}-${pad2(last)}`;
};

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export const monthName = (m: number): string => MONTH_NAMES[m - 1] ?? "";
