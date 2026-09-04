import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

export const CLI_ENTRY = join(here, "..", "..", "src", "index.ts");
// Resolve tsx's CLI script directly and run it with `node`, instead of going
// through `npx`/a shell — shell-based spawning on Windows joins array
// arguments with plain spaces instead of quoting them, silently truncating
// any argument that contains a space (e.g. a multi-word commit message).
const TSX_CLI = require.resolve("tsx/cli");

export interface CliResult {
  status: number | null;
  stdout: string;
  stderr: string;
}

/** Runs the CLI's TypeScript source directly via tsx, against `cwd`. */
export function runCli(args: string[], cwd: string): CliResult {
  const result = spawnSync(process.execPath, [TSX_CLI, CLI_ENTRY, ...args], {
    cwd,
    encoding: "utf-8",
  });

  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}
