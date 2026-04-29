import { error as humanError } from "../core/log.ts";
import type { ParsedArgs } from "./argv.ts";

export type ErrCode =
  | "ENOENT"
  | "ENOTFOUND"
  | "EVALIDATION"
  | "EAMBIGUOUS"
  | "EUNKNOWN";

export const SCHEMA_VERSION = "1.0";

export type OkEnvelope<T> = {
  ok: true;
  schema_version: string;
  data: T;
};
export type ErrEnvelope = {
  ok: false;
  schema_version: string;
  error: string;
  code: ErrCode;
};

type Writer = (s: string) => void;

const stdout: Writer = (s) => process.stdout.write(s);
const stderr: Writer = (s) => process.stderr.write(s);

export const isJson = (args: ParsedArgs): boolean =>
  args.flags["json"] === true;

export const okJson = <T>(data: T, write: Writer = stdout): void => {
  write(`${JSON.stringify({ ok: true, schema_version: SCHEMA_VERSION, data })}\n`);
};

export const errJson = (
  message: string,
  code: ErrCode,
  write: Writer = stderr,
): void => {
  write(
    `${JSON.stringify({ ok: false, schema_version: SCHEMA_VERSION, error: message, code })}\n`,
  );
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
