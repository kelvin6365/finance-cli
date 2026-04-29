export type FlagValue = string | boolean;

export type ParsedArgs = {
  command: string;
  positional: string[];
  flags: Record<string, FlagValue>;
};

export type ParseOptions = {
  booleanFlags?: string[];
};

const isFlag = (s: string): boolean =>
  s.startsWith("--") || (s.startsWith("-") && s.length > 1 && !/^-\d/.test(s));

export const parseArgv = (
  argv: string[],
  opts: ParseOptions = {},
): ParsedArgs => {
  const booleans = new Set(opts.booleanFlags ?? []);
  // If the first arg is a flag (e.g. `finance --json`), treat the command as
  // empty so the bare-command dispatcher runs with the flag in scope.
  const leadingIsFlag = argv[0] !== undefined && isFlag(argv[0]);
  const command = leadingIsFlag ? "" : (argv[0] ?? "");
  const rest = leadingIsFlag ? argv : argv.slice(1);
  const positional: string[] = [];
  const flags: Record<string, FlagValue> = {};

  const consume = (key: string, i: number): number => {
    if (booleans.has(key)) {
      flags[key] = true;
      return i;
    }
    const next = rest[i + 1];
    if (next !== undefined && !isFlag(next)) {
      flags[key] = next;
      return i + 1;
    }
    flags[key] = true;
    return i;
  };

  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i] as string;

    if (arg.startsWith("--")) {
      const eq = arg.indexOf("=");
      if (eq >= 0) {
        flags[arg.slice(2, eq)] = arg.slice(eq + 1);
        continue;
      }
      i = consume(arg.slice(2), i);
      continue;
    }

    if (arg.startsWith("-") && arg.length > 1 && !/^-\d/.test(arg)) {
      i = consume(arg.slice(1), i);
      continue;
    }

    positional.push(arg);
  }

  return { command, positional, flags };
};
