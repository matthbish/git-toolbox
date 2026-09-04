import { describe, it, expect, afterEach } from "vitest";
import { writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  repoRoot,
  currentBranch,
  hasUpstream,
  commitCount,
  defaultRemoteBranch,
  mainOrMasterBranch,
  localBranchesMatching,
  diffAgainstWorkingTree,
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
    // Check functional equivalence (does the returned root actually contain
    // the repo's files?) rather than exact string equality: git and Node
    // don't agree on canonical form for the same directory on every OS —
    // e.g. Windows short (8.3) vs. long names, or macOS's /var -> /private/var
    // symlink — so comparing raw path strings is inherently flaky here.
    const root = repoRoot(repo.dir);
    expect(existsSync(join(root, "README.md"))).toBe(true);
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

describe("mainOrMasterBranch", () => {
  it("prefers 'main' when both exist", () => {
    repo = createTempRepo();
    git(["branch", "master"], repo.dir);
    expect(mainOrMasterBranch(repo.dir)).toBe("main");
  });

  it("falls back to 'master' when 'main' doesn't exist", () => {
    repo = createTempRepo();
    git(["branch", "-m", "main", "master"], repo.dir);
    git(["update-ref", "-d", "refs/remotes/origin/main"], repo.dir);
    expect(mainOrMasterBranch(repo.dir)).toBe("master");
  });

  it("returns undefined when neither exists", () => {
    repo = createTempRepo();
    git(["branch", "-m", "main", "trunk"], repo.dir);
    git(["update-ref", "-d", "refs/remotes/origin/main"], repo.dir);
    expect(mainOrMasterBranch(repo.dir)).toBeUndefined();
  });
});

describe("diffAgainstWorkingTree", () => {
  it("includes committed, staged, and unstaged changes vs. the merge-base", () => {
    repo = createTempRepo();

    // Already tracked on main before the branch exists, so an unstaged edit
    // to it below shows up as a real modification, not a wholesale add.
    writeFileSync(join(repo.dir, "tracked.txt"), "original");
    git(["add", "--all"], repo.dir);
    git(["commit", "-m", "add tracked file"], repo.dir);

    git(["checkout", "-b", "feature/x"], repo.dir);

    // Committed on this branch.
    writeFileSync(join(repo.dir, "committed.txt"), "committed");
    git(["add", "--all"], repo.dir);
    git(["commit", "-m", "add committed file"], repo.dir);

    // Staged: a new file added to the index but not committed.
    writeFileSync(join(repo.dir, "staged.txt"), "staged");
    git(["add", "--all"], repo.dir);

    // Unstaged: a modification to an already-tracked file, left unstaged.
    writeFileSync(join(repo.dir, "tracked.txt"), "modified");

    const diff = diffAgainstWorkingTree(repo.dir, "main");

    expect(diff).toMatch(/committed\.txt/);
    expect(diff).toMatch(/staged\.txt/);
    expect(diff).toMatch(/tracked\.txt/);
    expect(diff).toMatch(/-original/);
    expect(diff).toMatch(/\+modified/);
  });

  it("passes through extra diff args, e.g. --unified=0", () => {
    repo = createTempRepo();
    git(["checkout", "-b", "feature/x"], repo.dir);
    writeFileSync(join(repo.dir, "a.txt"), "line1\nline2\nline3\n");
    git(["add", "--all"], repo.dir);
    git(["commit", "-m", "add a.txt"], repo.dir);

    // Unstaged modification, surrounded by unchanged context lines.
    writeFileSync(join(repo.dir, "a.txt"), "line1\nCHANGED\nline3\n");

    const diff = diffAgainstWorkingTree(repo.dir, "main", ["--unified=0"]);

    expect(diff).toMatch(/CHANGED/);
    expect(diff).not.toMatch(/^ line/m);
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
