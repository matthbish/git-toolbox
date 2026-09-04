import { describe, it, expect, afterEach } from "vitest";
import { writeFileSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  repoRoot,
  currentBranch,
  hasUpstream,
  commitCount,
  defaultRemoteBranch,
  localBranchesMatching,
  git,
} from "../../src/lib/git.js";
import { NotAGitRepoError } from "../../src/lib/errors.js";
import { createTempRepo, type TempRepo } from "../helpers/tempRepo.js";

let repo: TempRepo | undefined;

afterEach(() => {
  repo?.cleanup();
  repo = undefined;
});

describe("repoRoot", () => {
  it("resolves the top-level directory of a repo", () => {
    repo = createTempRepo();
    // Compare against the realpath, not the raw temp-dir path: on macOS
    // the OS temp dir is a symlink (/var -> /private/var), and on Windows
    // the raw path can use an 8.3 short name (RUNNER~1) that differs from
    // what git itself resolves to. `git rev-parse --show-toplevel` always
    // returns the canonical form, same as realpathSync.
    const expected = realpathSync(repo.dir).replace(/\\/g, "/").toLowerCase();
    expect(repoRoot(repo.dir).toLowerCase()).toBe(expected);
  });

  it("throws NotAGitRepoError outside of a repository", () => {
    expect(() => repoRoot(tmpdir())).toThrow(NotAGitRepoError);
  });
});

describe("currentBranch", () => {
  it("returns the checked-out branch name", () => {
    repo = createTempRepo();
    expect(currentBranch(repo.dir)).toBe("main");
  });
});

describe("hasUpstream / commitCount", () => {
  it("reports an upstream once pushed, and counts commits", () => {
    repo = createTempRepo();
    expect(hasUpstream(repo.dir, "main")).toBe(true);
    expect(commitCount(repo.dir)).toBe(1);

    writeFileSync(join(repo.dir, "a.txt"), "a");
    git(["add", "--all"], repo.dir);
    git(["commit", "-m", "second"], repo.dir);
    expect(commitCount(repo.dir)).toBe(2);
  });

  it("reports no upstream for a fresh local branch", () => {
    repo = createTempRepo();
    git(["checkout", "-b", "feature/x"], repo.dir);
    expect(hasUpstream(repo.dir, "feature/x")).toBe(false);
  });
});

describe("defaultRemoteBranch", () => {
  it("detects origin/HEAD", () => {
    repo = createTempRepo();
    expect(defaultRemoteBranch(repo.dir)).toBe("main");
  });
});

describe("localBranchesMatching", () => {
  it("filters branches by prefix", () => {
    repo = createTempRepo();
    git(["branch", "review-a"], repo.dir);
    git(["branch", "review-b"], repo.dir);
    git(["branch", "keep-me"], repo.dir);

    const matches = localBranchesMatching(repo.dir, "review-").sort();
    expect(matches).toEqual(["review-a", "review-b"]);
  });
});
