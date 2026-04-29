const useColor = (): boolean => process.stderr.isTTY === true;

const RESET = "\x1b[0m";
const BLUE = "\x1b[34m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";

const wrap = (color: string, msg: string): string =>
  useColor() ? `${color}${msg}${RESET}` : msg;

export const info = (msg: string): void => {
  process.stderr.write(`${wrap(BLUE, "ℹ")} ${msg}\n`);
};

export const warn = (msg: string): void => {
  process.stderr.write(`${wrap(YELLOW, "⚠")} ${msg}\n`);
};

export const error = (msg: string): void => {
  process.stderr.write(`${wrap(RED, "✖")} ${msg}\n`);
};
