import { error as humanError } from "../core/log.ts";
import type { ParsedArgs } from "./argv.ts";

export type ErrCode =
  | "ENOENT"
  | "ENOTFOUND"
  | "EVALIDATION"
  | "EAMBIGUOUS"
  | "EUNKNOWN";

export type OkEnvelope<T> = { ok: true; data: T };
export type ErrEnvelope = { ok: false; error: string; code: ErrCode };

type Writer = (s: string) => void;

const stdout: Writer = (s) => process.stdout.write(s);
const stderr: Writer = (s) => process.stderr.write(s);

export const isJson = (args: ParsedArgs): boolean =>
  args.flags["json"] === true;

export const okJson = <T>(data: T, write: Writer = stdout): void => {
  write(`${JSON.stringify({ ok: true, data })}\n`);
};

export const errJson = (
  message: string,
  code: ErrCode,
  write: Writer = stderr,
): void => {
  write(`${JSON.stringify({ ok: false, error: message, code })}\n`);
};

export const fail = (
  args: ParsedArgs,
  message: string,
  code: ErrCode,
): number => {
  if (isJson(args)) errJson(message, code);
  else humanError(message);
  return 1;
};
