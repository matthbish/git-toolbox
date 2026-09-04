import { Command } from "commander";
import { repoRoot, currentBranch, commitCount } from "../lib/git.js";
import { runInherit } from "../lib/exec.js";
import { UsageError } from "../lib/errors.js";

export function parseSquashCount(raw: string, totalCommits: number): number {
  const count = Number.parseInt(raw, 10);

  if (!Number.isInteger(count) || String(count) !== raw.trim() || count < 2) {
    throw new UsageError("`count` must be a whole number of 2 or more.");
  }

  if (count > totalCommits) {
    throw new UsageError(`Branch only has ${totalCommits} commit(s); cannot squash ${count}.`);
  }

  return count;
}

/**
 * `git-toolbox squash <count> <message>`
 *
 * Squashes the last `count` commits on the current branch into a single
 * commit with a new message, then force-pushes. Handy for cleaning up a
 * string of "wip" / "fix typo" commits before merging.
 *
 * Rewrites history on the remote branch — same caution as `amend` applies.
 *
 * Example:
 *   git-toolbox squash 4 "implement search endpoint"
 */
export function registerSquash(program: Command): void {
  program
    .command("squash")
    .argument("<count>", "number of most recent commits to squash together")
    .argument("<message>", "commit message for the resulting commit")
    .description("Squash the last <count> commits into one and force-push.")
    .action((countArg: string, message: string) => {
      if (!message.trim()) {
        throw new UsageError("Commit message must not be empty.");
      }

      const cwd = repoRoot();
      const branch = currentBranch(cwd);
      const count = parseSquashCount(countArg, commitCount(cwd));

      runInherit("git", ["reset", "--soft", `HEAD~${count}`], { cwd });
      runInherit("git", ["commit", "-m", message], { cwd });
      runInherit("git", ["push", "--force-with-lease", "origin", branch], { cwd });

      console.log(`Squashed ${count} commits into one and force-pushed '${branch}'.`);
    });
}
