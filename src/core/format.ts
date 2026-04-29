const groupThousands = (n: number): string => {
  const s = String(n);
  const out: string[] = [];
  for (let i = s.length; i > 0; i -= 3) {
    out.unshift(s.slice(Math.max(0, i - 3), i));
  }
  return out.join(",");
};

export type MoneyOptions = {
  signed?: boolean;
  symbol?: string;
};

let defaultSymbol = "$";

export const setCurrencySymbol = (symbol: string): void => {
  defaultSymbol = symbol;
};

export const money = (n: number, opts: MoneyOptions = {}): string => {
  const symbol = opts.symbol ?? defaultSymbol;
  const abs = Math.abs(n);
  const body = `${symbol}${groupThousands(abs)}`;
  if (n < 0) return `-${body}`;
  if (opts.signed && n > 0) return `+${body}`;
  return body;
};

export const percent = (n: number): string => {
  return `${Math.round(n * 100)}%`;
};

export const bar = (value: number, max: number, width: number): string => {
  if (width <= 0) return "";
  const safeMax = max > 0 ? max : 0;
  const ratio = safeMax === 0 ? 0 : Math.max(0, Math.min(1, value / safeMax));
  const filled = Math.round(ratio * width);
  return "▓".repeat(filled) + "░".repeat(width - filled);
};

export const padRight = (s: string, n: number): string => {
  if (s.length >= n) return s;
  return s + " ".repeat(n - s.length);
};

export const truncate = (s: string, n: number): string => {
  if (n <= 0) return "";
  if (s.length <= n) return s;
  if (n <= 1) return s.slice(0, n);
  return `${s.slice(0, n - 1)}…`;
};
