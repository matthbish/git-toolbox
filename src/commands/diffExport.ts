import { Command } from "commander";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { repoRoot, currentBranch, defaultRemoteBranch } from "../lib/git.js";
import { run } from "../lib/exec.js";
import { UsageError } from "../lib/errors.js";

/**
 * `git-toolbox diff-export`
 *
 * Saves the diff between the current branch and another branch to a patch
 * file — useful for sharing a change outside of git (email, a ticket,
 * offline review) or archiving it before an interactive rebase.
 *
 * Diffs against the repository's detected default branch (via
 * origin/HEAD) unless --against is given.
 *
 * Examples:
 *   git-toolbox diff-export
 *   git-toolbox diff-export --against release/2.0 --out release.patch
 */
export function registerDiffExport(program: Command): void {
  program
    .command("diff-export")
    .description("Save the diff against another branch to a patch file.")
    .option("--against <branch>", "branch to diff against (defaults to the repo's default branch)")
    .option("--out <file>", "output path (defaults to <branch>-vs-<against>.patch)")
    .action((options: { against?: string; out?: string }) => {
      const cwd = repoRoot();
      const branch = currentBranch(cwd);
      const against = options.against ?? defaultRemoteBranch(cwd);

      if (!against) {
        throw new UsageError(
          "Could not determine the repository's default branch; pass --against <branch>.",
        );
      }

      const diff = run("git", ["diff", `${against}...`], { cwd });
      const outPath = resolve(options.out ?? `${branch}-vs-${against}.patch`);

      writeFileSync(outPath, `${diff}\n`, "utf-8");
      console.log(`Diff saved to ${outPath}`);
    });
}
