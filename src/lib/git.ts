import { run } from "./exec.js";
import { NotAGitRepoError, UsageError } from "./errors.js";

function git(args: string[], cwd?: string): string {
  return run("git", args, { cwd });
}

/** Resolves the top-level directory of the git repository containing `cwd`. */
export function repoRoot(cwd: string = process.cwd()): string {
  try {
    return git(["rev-parse", "--show-toplevel"], cwd);
  } catch {
    throw new NotAGitRepoError();
  }
}

/** Returns the current branch name, or throws if HEAD is detached. */
export function currentBranch(cwd: string): string {
  const branch = git(["rev-parse", "--abbrev-ref", "HEAD"], cwd);
  if (branch === "HEAD") {
    throw new UsageError(
      "HEAD is detached (not on a branch). Check out a branch before running this command.",
    );
  }
  return branch;
}

/** Whether `branch` has an upstream tracking branch configured. */
export function hasUpstream(cwd: string, branch: string): boolean {
  try {
    git(["rev-parse", "--abbrev-ref", "--symbolic-full-name", `${branch}@{u}`], cwd);
    return true;
  } catch {
    return false;
  }
}

/** Total number of commits reachable from HEAD. */
export function commitCount(cwd: string): number {
  return Number.parseInt(git(["rev-list", "--count", "HEAD"], cwd), 10);
}

/**
 * Best-effort detection of the remote's default branch (e.g. "main"),
 * via origin/HEAD. Returns undefined if it can't be determined, so callers
 * can fall back to requiring an explicit branch from the user.
 */
export function defaultRemoteBranch(cwd: string): string | undefined {
  try {
    const ref = git(["symbolic-ref", "refs/remotes/origin/HEAD"], cwd);
    return ref.replace(/^refs\/remotes\/origin\//, "");
  } catch {
    return undefined;
  }
}

/**
 * Falls back to "main" if it exists (locally or on origin), else "master".
 * Returns undefined if neither exists.
 */
export function mainOrMasterBranch(cwd: string): string | undefined {
  for (const name of ["main", "master"]) {
    try {
      git(["rev-parse", "--verify", "--quiet", name], cwd);
      return name;
    } catch {
      // fall through to checking origin's copy
    }
    try {
      git(["rev-parse", "--verify", "--quiet", `origin/${name}`], cwd);
      return name;
    } catch {
      // try the next candidate
    }
  }
  return undefined;
}

/**
 * Diff from the merge-base of `against` and HEAD to the current working
 * tree. Unlike `git diff against...HEAD` (which stops at HEAD), this also
 * picks up staged and unstaged changes — so it covers pushed commits,
 * unpushed commits, and uncommitted work in one diff.
 */
export function diffAgainstWorkingTree(
  cwd: string,
  against: string,
  extraArgs: string[] = [],
): string {
  const mergeBase = git(["merge-base", against, "HEAD"], cwd);
  return git(["diff", ...extraArgs, mergeBase], cwd);
}

/** Local branch names starting with `prefix`, most recently used first. */
export function localBranchesMatching(cwd: string, prefix: string): string[] {
  const output = git(["branch", "--list", `${prefix}*`, "--format=%(refname:short)"], cwd);
  return output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export { git };
