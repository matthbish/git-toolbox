import { describe, it, expect, afterEach } from "vitest";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { createTempRepo, type TempRepo } from "./helpers/tempRepo.js";

const here = dirname(fileURLToPath(import.meta.url));
const DIST_ENTRY = join(here, "..", "dist", "index.js");

/**
 * Runs the *built* dist/index.js directly with `node`, the same way a
 * global `npm install -g` (or `npx`) would invoke the `git-toolbox` bin —
 * as opposed to the other integration tests, which run the TypeScript
 * source directly via tsx.
 */
function runDistCli(args: string[], cwd: string): { status: number | null; stdout: string } {
  const result = spawnSync(process.execPath, [DIST_ENTRY, ...args], { cwd, encoding: "utf-8" });
  return { status: result.status, stdout: result.stdout ?? "" };
}

let repo: TempRepo | undefined;

afterEach(() => {
  repo?.cleanup();
  repo = undefined;
});

describe("running the built CLI (as an npm install would)", () => {
  it("dist/index.js was built", () => {
    expect(existsSync(DIST_ENTRY)).toBe(true);
  });

  it("stores and reuses branch memory in the target repo's own .git, not the toolbox's", () => {
    repo = createTempRepo();
    spawnSync("git", ["checkout", "-b", "feature/x"], { cwd: repo.dir });
    writeFileSync(join(repo.dir, "code.ts"), "// TODO: check this\n");
    spawnSync("git", ["add", "--all"], { cwd: repo.dir });
    spawnSync("git", ["commit", "-m", "wip"], { cwd: repo.dir });

    const first = runDistCli(["todos", "--against", "main"], repo.dir);
    expect(first.status).toBe(0);
    expect(first.stdout).toMatch(/vs 'main'/);

    const second = runDistCli(["todos"], repo.dir);
    expect(second.status).toBe(0);
    expect(second.stdout).toMatch(/vs 'main'/);

    const stateFile = join(repo.dir, ".git", "git-toolbox-state.json");
    expect(existsSync(stateFile)).toBe(true);
    expect(JSON.parse(readFileSync(stateFile, "utf-8"))).toEqual({
      lastAgainstByCommand: { todos: "main" },
    });
  });
});
