import { Command } from "commander";
import { repoRoot, currentBranch, hasUpstream } from "../lib/git.js";
import { runInherit } from "../lib/exec.js";
import { UsageError } from "../lib/errors.js";

/**
 * `git-toolbox push <message>`
 *
 * Stages every change, commits it, and pushes the current branch —
 * the three commands you run back-to-back after finishing a piece of work.
 * On a branch's first push it automatically sets the upstream
 * (`--set-upstream`), so there's no separate "push a new branch" command.
 *
 * Examples:
 *   git-toolbox push "fix off-by-one in pagination"
 *   git-toolbox push --no-add "commit only what I already staged"
 */
export function registerPush(program: Command): void {
  program
    .command("push")
    .argument("<message>", "commit message")
    .description("Stage all changes, commit, and push the current branch.")
    .option("--no-add", "commit only what is already staged instead of staging everything")
    .action((message: string, options: { add: boolean }) => {
      if (!message.trim()) {
        throw new UsageError("Commit message must not be empty.");
      }

      const cwd = repoRoot();
      const branch = currentBranch(cwd);

      if (options.add) {
        runInherit("git", ["add", "--all"], { cwd });
      }

      runInherit("git", ["commit", "-m", message], { cwd });

      if (hasUpstream(cwd, branch)) {
        runInherit("git", ["push", "origin", branch], { cwd });
      } else {
        runInherit("git", ["push", "--set-upstream", "origin", branch], { cwd });
      }

      console.log(`Pushed '${branch}' to origin.`);
    });
}
