import { describe, it, expect, afterEach } from "vitest";
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { createTempRepo, type TempRepo } from "./helpers/tempRepo.js";
import { runCli } from "./helpers/cli.js";

function git(cwd: string, args: string[]): string {
  const result = spawnSync("git", args, { cwd, encoding: "utf-8" });
  return (result.stdout ?? "").trim();
}

let repo: TempRepo | undefined;

afterEach(() => {
  repo?.cleanup();
  repo = undefined;
});

describe("push", () => {
  it("stages, commits, and pushes the current branch", () => {
    repo = createTempRepo();
    writeFileSync(join(repo.dir, "file.txt"), "content");

    const result = runCli(["push", "add a file"], repo.dir);

    expect(result.status).toBe(0);
    expect(git(repo.dir, ["log", "-1", "--pretty=%s"])).toBe("add a file");
    expect(git(repo.remoteDir, ["log", "-1", "--pretty=%s"])).toBe("add a file");
  });

  it("sets upstream automatically for a brand-new branch", () => {
    repo = createTempRepo();
    git(repo.dir, ["checkout", "-b", "feature/new"]);
    writeFileSync(join(repo.dir, "file.txt"), "content");

    const result = runCli(["push", "new feature"], repo.dir);

    expect(result.status).toBe(0);
    expect(git(repo.dir, ["rev-parse", "--abbrev-ref", "feature/new@{u}"])).toBe(
      "origin/feature/new",
    );
  });

  it("fails with exit code 2 on an empty commit message", () => {
    repo = createTempRepo();
    const result = runCli(["push", "  "], repo.dir);
    expect(result.status).toBe(2);
    expect(result.stderr).toMatch(/must not be empty/);
  });

  it("fails outside of a git repository", () => {
    const result = runCli(["push", "msg"], tmpdir());
    expect(result.status).toBe(2);
    expect(result.stderr).toMatch(/not inside a git repository/i);
  });
});

describe("pull", () => {
  it("fetches and pulls the current branch", () => {
    repo = createTempRepo();

    // Simulate a second contributor pushing to origin.
    const otherClone = join(repo.dir, "..", "other-clone");
    spawnSync("git", ["clone", repo.remoteDir, otherClone]);
    git(otherClone, ["config", "user.name", "Other"]);
    git(otherClone, ["config", "user.email", "other@example.com"]);
    writeFileSync(join(otherClone, "from-other.txt"), "x");
    git(otherClone, ["add", "--all"]);
    git(otherClone, ["commit", "-m", "from other"]);
    git(otherClone, ["push", "origin", "main"]);

    const result = runCli(["pull"], repo.dir);

    expect(result.status).toBe(0);
    expect(existsSync(join(repo.dir, "from-other.txt"))).toBe(true);
  });
});

describe("amend", () => {
  it("folds staged changes into the last commit and force-pushes", () => {
    repo = createTempRepo();
    writeFileSync(join(repo.dir, "extra.txt"), "extra");

    const result = runCli(["amend"], repo.dir);

    expect(result.status).toBe(0);
    expect(git(repo.dir, ["rev-list", "--count", "HEAD"])).toBe("1");
    expect(git(repo.remoteDir, ["rev-list", "--count", "main"])).toBe("1");
  });

  it("replaces the commit message when --message is given", () => {
    repo = createTempRepo();
    const result = runCli(["amend", "--message", "new message"], repo.dir);
    expect(result.status).toBe(0);
    expect(git(repo.dir, ["log", "-1", "--pretty=%s"])).toBe("new message");
  });
});

describe("squash", () => {
  it("combines the last N commits into one and force-pushes", () => {
    repo = createTempRepo();
    for (const name of ["a", "b", "c"]) {
      writeFileSync(join(repo.dir, `${name}.txt`), name);
      git(repo.dir, ["add", "--all"]);
      git(repo.dir, ["commit", "-m", `add ${name}`]);
    }
    expect(git(repo.dir, ["rev-list", "--count", "HEAD"])).toBe("4");

    const result = runCli(["squash", "3", "combined work"], repo.dir);

    expect(result.status).toBe(0);
    expect(git(repo.dir, ["rev-list", "--count", "HEAD"])).toBe("2");
    expect(git(repo.dir, ["log", "-1", "--pretty=%s"])).toBe("combined work");
  });

  it("rejects a count larger than the available commits", () => {
    repo = createTempRepo();
    const result = runCli(["squash", "99", "message"], repo.dir);
    expect(result.status).toBe(2);
    expect(result.stderr).toMatch(/only has 1 commit/);
  });
});

describe("clean-branches", () => {
  it("deletes local branches matching the prefix, keeping the current branch", () => {
    repo = createTempRepo();
    git(repo.dir, ["branch", "review-a"]);
    git(repo.dir, ["branch", "review-b"]);
    git(repo.dir, ["branch", "keep-me"]);

    const result = runCli(["clean-branches", "review-"], repo.dir);

    expect(result.status).toBe(0);
    const remaining = git(repo.dir, ["branch", "--format=%(refname:short)"]).split("\n");
    expect(remaining).toContain("keep-me");
    expect(remaining).not.toContain("review-a");
    expect(remaining).not.toContain("review-b");
  });

  it("--dry-run lists branches without deleting them", () => {
    repo = createTempRepo();
    git(repo.dir, ["branch", "review-a"]);

    const result = runCli(["clean-branches", "review-", "--dry-run"], repo.dir);

    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/review-a/);
    const remaining = git(repo.dir, ["branch", "--format=%(refname:short)"]).split("\n");
    expect(remaining).toContain("review-a");
  });
});

describe("diff-export", () => {
  it("writes the diff against the default branch to a patch file", () => {
    repo = createTempRepo();
    git(repo.dir, ["checkout", "-b", "feature/x"]);
    writeFileSync(join(repo.dir, "new.txt"), "hello");
    git(repo.dir, ["add", "--all"]);
    git(repo.dir, ["commit", "-m", "add new file"]);

    const outFile = join(repo.dir, "out.patch");
    const result = runCli(["diff-export", "--out", outFile], repo.dir);

    expect(result.status).toBe(0);
    expect(existsSync(outFile)).toBe(true);
    expect(readFileSync(outFile, "utf-8")).toMatch(/new\.txt/);
  });
});

describe("todos", () => {
  it("reports TODOs added relative to the default branch", () => {
    repo = createTempRepo();
    git(repo.dir, ["checkout", "-b", "feature/x"]);
    writeFileSync(join(repo.dir, "code.ts"), "// TODO: finish this\n");
    git(repo.dir, ["add", "--all"]);
    git(repo.dir, ["commit", "-m", "wip"]);

    const result = runCli(["todos"], repo.dir);

    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/code\.ts/);
    expect(result.stdout).toMatch(/TODO: finish this/);
  });

  it("reports no TODOs cleanly when there are none", () => {
    repo = createTempRepo();
    git(repo.dir, ["checkout", "-b", "feature/x"]);
    writeFileSync(join(repo.dir, "code.ts"), "console.log('hi');\n");
    git(repo.dir, ["add", "--all"]);
    git(repo.dir, ["commit", "-m", "wip"]);

    const result = runCli(["todos"], repo.dir);

    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/No added TODOs/);
  });
});

describe("--help", () => {
  it("exits 0 and lists all subcommands", () => {
    repo = createTempRepo();
    const result = runCli(["--help"], repo.dir);
    expect(result.status).toBe(0);
    for (const cmd of [
      "push",
      "pull",
      "amend",
      "squash",
      "clean-branches",
      "diff-export",
      "todos",
    ]) {
      expect(result.stdout).toContain(cmd);
    }
  });
});
