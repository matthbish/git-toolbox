import { Command } from "commander";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { repoRoot, currentBranch, mainOrMasterBranch, diffAgainstWorkingTree } from "../lib/git.js";
import { UsageError } from "../lib/errors.js";
import { getLastAgainst, setLastAgainst, branchMemoryHelpText } from "../lib/state.js";

/**
 * `git-toolbox diff-export`
 *
 * Saves the diff between the current branch and another branch to a patch
 * file — useful for sharing a change outside of git (email, a ticket,
 * offline review) or archiving it before an interactive rebase. Covers
 * pushed commits, unpushed commits, and any staged or unstaged changes
 * in the working tree.
 *
 * Diffs against, in order: the branch passed via --against; failing that,
 * whatever branch was last passed to --against for this repo; failing
 * that, "main" if it exists, else "master".
 *
 * Examples:
 *   git-toolbox diff-export
 *   git-toolbox diff-export --against release/2.0 --out release.patch
 */
export function registerDiffExport(program: Command): void {
  program
    .command("diff-export")
    .description("Save the diff against another branch to a patch file.")
    .option(
      "--against <branch>",
      "branch to diff against (defaults to the last branch used, then 'main'/'master')",
    )
    .option("--out <file>", "output path (defaults to <branch>-vs-<against>.patch)")
    .addHelpText("after", branchMemoryHelpText("diff-export"))
    .action((options: { against?: string; out?: string }) => {
      const cwd = repoRoot();
      const branch = currentBranch(cwd);
      const against =
        options.against ?? getLastAgainst(cwd, "diff-export") ?? mainOrMasterBranch(cwd);

      if (!against) {
        throw new UsageError(
          "Could not determine a branch to diff against (no remembered branch, and " +
            "neither 'main' nor 'master' exists); pass --against <branch>.",
        );
      }

      if (options.against) {
        setLastAgainst(cwd, "diff-export", options.against);
      }

      const diff = diffAgainstWorkingTree(cwd, against);
      const outPath = resolve(options.out ?? `${branch}-vs-${against}.patch`);

      writeFileSync(outPath, `${diff}\n`, "utf-8");
      console.log(`Diff saved to ${outPath}`);
    });
}
