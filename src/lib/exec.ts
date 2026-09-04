import { spawnSync } from "node:child_process";

/**
 * Thrown when a subprocess exits with a non-zero status. Never built from
 * shell-interpolated strings — every command runs via spawnSync with an
 * argument array, so user input can't be interpreted as shell syntax.
 */
export class CommandError extends Error {
  constructor(
    public readonly command: string,
    public readonly args: string[],
    public readonly exitCode: number | null,
    stderr: string,
  ) {
    super(
      `${command} ${args.join(" ")} failed (exit ${exitCode ?? "unknown"})${
        stderr.trim() ? `: ${stderr.trim()}` : ""
      }`,
    );
    this.name = "CommandError";
  }
}

export interface RunOptions {
  cwd?: string | undefined;
}

/** Runs a command and returns trimmed stdout. Throws CommandError on failure. */
export function run(command: string, args: string[], options: RunOptions = {}): string {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    encoding: "utf-8",
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new CommandError(command, args, result.status, result.stderr ?? "");
  }

  return (result.stdout ?? "").trim();
}

/** Runs a command with stdio inherited so the user sees git's own output. */
export function runInherit(command: string, args: string[], options: RunOptions = {}): void {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    stdio: "inherit",
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new CommandError(command, args, result.status, "");
  }
}
