import { Command } from "commander";
import { repoRoot, currentBranch, localBranchesMatching, git } from "../lib/git.js";
import { UsageError } from "../lib/errors.js";
import { CommandError } from "../lib/exec.js";

/**
 * `git-toolbox clean-branches <prefix>`
 *
 * Deletes local branches whose name starts with `prefix` — for clearing
 * out the pile of merged review/scratch branches (e.g. `review-`,
 * `mr-upstream-`) that accumulate over time. The current branch is never
 * touched even if it matches.
 *
 * By default this uses `git branch -d`, which refuses to delete a branch
 * with unmerged commits; pass --force for the unconditional `-D` behavior.
 *
 * Examples:
 *   git-toolbox clean-branches review-
 *   git-toolbox clean-branches review- --dry-run
 *   git-toolbox clean-branches review- --force
 */
export function registerCleanBranches(program: Command): void {
  program
    .command("clean-branches")
    .argument("<prefix>", "delete local branches whose name starts with this")
    .description("Delete local branches matching a name prefix.")
    .option("--force", "delete branches even if they contain unmerged commits")
    .option("--dry-run", "list matching branches without deleting them")
    .action((prefix: string, options: { force?: boolean; dryRun?: boolean }) => {
      if (!prefix.trim()) {
        throw new UsageError("A branch name prefix is required.");
      }

      const cwd = repoRoot();
      const active = currentBranch(cwd);
      const matches = localBranchesMatching(cwd, prefix).filter((branch) => branch !== active);

      if (matches.length === 0) {
        console.log(`No local branches matching '${prefix}*' (other than the current branch).`);
        return;
      }

      if (options.dryRun) {
        console.log(`Would delete ${matches.length} branch(es):`);
        for (const branch of matches) console.log(`  ${branch}`);
        return;
      }

      const flag = options.force ? "-D" : "-d";
      let deleted = 0;

      for (const branch of matches) {
        try {
          git(["branch", flag, branch], cwd);
          console.log(`Deleted ${branch}`);
          deleted++;
        } catch (err) {
          const reason = err instanceof CommandError ? err.message : String(err);
          console.error(`Skipped ${branch}: ${reason}`);
        }
      }

      console.log(`Deleted ${deleted}/${matches.length} branch(es).`);
    });
}
