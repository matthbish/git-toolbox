import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

interface StateFile {
  lastAgainstByCommand?: Record<string, string>;
}

/**
 * Name of the per-repo state file, relative to the repo's `.git` directory.
 * This is a plain JSON file (`{ "lastAgainstByCommand": { "<command>": "<branch>" } }`)
 * that you can inspect, hand-edit, or delete — see each command's --help
 * ("Branch memory" section) or the README for details.
 *
 * Scoped to the repository you're running commands *in* (via `.git`), not
 * to wherever git-toolbox itself is installed — so this works the same
 * whether git-toolbox was installed with `npm install -g`, run via `npx`,
 * or run from a source checkout.
 */
export const STATE_FILENAME = "git-toolbox-state.json";

function statePath(cwd: string): string {
  return join(cwd, ".git", STATE_FILENAME);
}

function readState(cwd: string): StateFile {
  try {
    return JSON.parse(readFileSync(statePath(cwd), "utf-8")) as StateFile;
  } catch {
    return {};
  }
}

/** The `--against` branch a command last remembered for itself, if any. */
export function getLastAgainst(cwd: string, command: string): string | undefined {
  return readState(cwd).lastAgainstByCommand?.[command];
}

/** Remembers `branch` as the given command's `--against` choice for next time. */
export function setLastAgainst(cwd: string, command: string, branch: string): void {
  const state = readState(cwd);
  state.lastAgainstByCommand = { ...state.lastAgainstByCommand, [command]: branch };
  mkdirSync(join(cwd, ".git"), { recursive: true });
  writeFileSync(statePath(cwd), JSON.stringify(state, null, 2));
}

/** Shared --help footer for commands that remember their `--against` branch. */
export function branchMemoryHelpText(command: string): string {
  return (
    "\nBranch memory:\n" +
    `  The last branch passed to --against is remembered per repository, in\n` +
    `  .git/${STATE_FILENAME}, and reused on the next '${command}' run that\n` +
    "  omits --against. To see it: cat .git/" +
    STATE_FILENAME +
    "\n" +
    `  To change it: pass --against <branch> again, or edit that file's\n` +
    `  lastAgainstByCommand.${command} value directly.\n` +
    "  To reset it: delete that key (or the whole file) — falls back to\n" +
    "  'main'/'master' after that.\n"
  );
}
