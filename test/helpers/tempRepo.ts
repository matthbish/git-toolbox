import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

export interface TempRepo {
  /** Working directory of the "local" clone. */
  dir: string;
  /** Bare repository standing in for "origin". */
  remoteDir: string;
  cleanup(): void;
}

function git(cwd: string, args: string[]): void {
  const result = spawnSync("git", args, { cwd, encoding: "utf-8" });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed in ${cwd}:\n${result.stderr}`);
  }
}

/**
 * Creates a throwaway bare "origin" repo and a local clone with an initial
 * commit, both configured with a test identity. Used by integration tests
 * that need to exercise real push/pull/fetch behavior.
 */
export function createTempRepo(): TempRepo {
  const root = mkdtempSync(join(tmpdir(), "git-toolbox-"));
  const remoteDir = join(root, "origin.git");
  const dir = join(root, "work");

  mkdirSync(remoteDir);
  git(remoteDir, ["init", "--bare", "-b", "main"]);

  git(root, ["clone", remoteDir, dir]);
  git(dir, ["config", "user.name", "Test User"]);
  git(dir, ["config", "user.email", "test@example.com"]);
  git(dir, ["config", "commit.gpgsign", "false"]);

  writeFileSync(join(dir, "README.md"), "# test repo\n");
  git(dir, ["add", "--all"]);
  git(dir, ["commit", "-m", "initial commit"]);
  git(dir, ["push", "--set-upstream", "origin", "main"]);
  git(dir, ["symbolic-ref", "refs/remotes/origin/HEAD", "refs/remotes/origin/main"]);

  return {
    dir,
    remoteDir,
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  };
}
