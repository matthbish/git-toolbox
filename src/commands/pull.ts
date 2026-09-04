import { Command } from "commander";
import { repoRoot, currentBranch } from "../lib/git.js";
import { runInherit } from "../lib/exec.js";

/**
 * `git-toolbox pull`
 *
 * Fetches from origin and pulls the current branch, without needing to
 * type the branch name yourself.
 *
 * Example:
 *   git-toolbox pull
 */
export function registerPull(program: Command): void {
  program
    .command("pull")
    .description("Fetch from origin and pull the current branch.")
    .action(() => {
      const cwd = repoRoot();
      const branch = currentBranch(cwd);

      runInherit("git", ["fetch", "origin"], { cwd });
      runInherit("git", ["pull", "origin", branch], { cwd });

      console.log(`Pulled '${branch}' from origin.`);
    });
}
