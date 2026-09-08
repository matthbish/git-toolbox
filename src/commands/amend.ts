import { Command } from "commander";
import { repoRoot, currentBranch } from "../lib/git.js";
import { runInherit } from "../lib/exec.js";

/**
 * `git-toolbox amend`
 *
 * Stages every change, folds it into the last commit, and force-pushes.
 * Useful for quick fixups to a commit you haven't shared review of yet.
 *
 * This rewrites history on the remote branch and force-pushes with a plain
 * `--force` — don't run it on a commit someone else has already pulled or
 * built on.
 *
 * Examples:
 *   git-toolbox amend
 *   git-toolbox amend --message "clearer commit message"
 *   git-toolbox amend --no-add
 */
export function registerAmend(program: Command): void {
  program
    .command("amend")
    .description("Stage changes, amend the last commit, and force-push the current branch.")
    .option("-m, --message <message>", "replace the commit message instead of keeping it")
    .option("--no-add", "amend using only what is already staged instead of staging everything")
    .action((options: { message?: string; add: boolean }) => {
      const cwd = repoRoot();
      const branch = currentBranch(cwd);

      if (options.add) {
        runInherit("git", ["add", "--all"], { cwd });
      }

      const commitArgs = options.message
        ? ["commit", "--amend", "-m", options.message]
        : ["commit", "--amend", "--no-edit"];

      runInherit("git", commitArgs, { cwd });
      runInherit("git", ["push", "--force", "origin", branch], { cwd });

      console.log(`Amended and force-pushed '${branch}'.`);
    });
}
