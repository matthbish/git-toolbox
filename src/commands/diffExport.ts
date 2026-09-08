import { Command } from "commander";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  repoRoot,
  currentBranch,
  mainOrMasterBranch,
  diffAgainstWorkingTree,
  fetchRemoteRef,
} from "../lib/git.js";
import { UsageError } from "../lib/errors.js";
import {
  getLastAgainst,
  setLastAgainst,
  getLastRemote,
  setLastRemote,
  branchMemoryHelpText,
} from "../lib/state.js";

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
 * that, "main" if it exists, else "master". The remote whose copy of that
 * branch is used (--remote; remembered the same way; defaults to "origin")
 * is always freshly fetched, so the comparison reflects the remote branch's
 * current state rather than whatever the local branch of that name points at.
 *
 * Examples:
 *   git-toolbox diff-export
 *   git-toolbox diff-export --against release/2.0 --out release.patch
 *   git-toolbox diff-export --against release/2.0 --remote upstream
 */
export function registerDiffExport(program: Command): void {
  program
    .command("diff-export")
    .description("Save the diff against another branch to a patch file.")
    .option(
      "--against <branch>",
      "branch to diff against (defaults to the last branch used, then 'main'/'master')",
    )
    .option(
      "--remote <remote>",
      "remote whose copy of the branch to diff against (defaults to the last remote used, then 'origin')",
    )
    .option("--out <file>", "output path (defaults to <branch>-vs-<against>.patch)")
    .addHelpText("after", branchMemoryHelpText("diff-export"))
    .action((options: { against?: string; remote?: string; out?: string }) => {
      const cwd = repoRoot();
      const branch = currentBranch(cwd);
      const remote = options.remote ?? getLastRemote(cwd, "diff-export") ?? "origin";
      const against =
        options.against ?? getLastAgainst(cwd, "diff-export") ?? mainOrMasterBranch(cwd, remote);

      if (!against) {
        throw new UsageError(
          "Could not determine a branch to diff against (no remembered branch, and " +
            `neither 'main' nor 'master' exists on '${remote}'); pass --against <branch>.`,
        );
      }

      if (options.against) {
        setLastAgainst(cwd, "diff-export", options.against);
      }
      if (options.remote) {
        setLastRemote(cwd, "diff-export", options.remote);
      }

      const remoteRef = fetchRemoteRef(cwd, remote, against);
      const diff = diffAgainstWorkingTree(cwd, remoteRef);
      const outPath = resolve(options.out ?? `${branch}-vs-${against}.patch`);

      writeFileSync(outPath, `${diff}\n`, "utf-8");
      console.log(`Diff saved to ${outPath} (vs '${remoteRef}')`);
    });
}
