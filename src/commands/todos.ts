import { Command } from "commander";
import {
  repoRoot,
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

/** Pure parsing logic, kept separate from git/IO so it's easy to unit test. */
export function extractAddedTodos(diff: string): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  let currentFile: string | null = null;

  for (const line of diff.split("\n")) {
    const fileMatch = /^diff --git a\/.+ b\/(.+)$/.exec(line);
    if (fileMatch) {
      currentFile = fileMatch[1] ?? null;
      continue;
    }

    if (!currentFile || line.startsWith("+++")) {
      continue;
    }

    if (line.startsWith("+") && line.includes("TODO")) {
      const text = line.slice(1).trim();
      const existing = result[currentFile] ?? [];
      existing.push(text);
      result[currentFile] = existing;
    }
  }

  return result;
}

/**
 * `git-toolbox todos`
 *
 * Lists TODO comments added on the current branch relative to another
 * branch — a quick way to catch "TODO: fix before merging" comments that
 * are about to ship. Covers pushed commits, unpushed commits, and any
 * staged or unstaged changes in the working tree.
 *
 * Diffs against, in order: the branch passed via --against; failing that,
 * whatever branch was last passed to --against for this repo; failing
 * that, "main" if it exists, else "master". The remote whose copy of that
 * branch is used (--remote; remembered the same way; defaults to "origin")
 * is always freshly fetched, so the comparison reflects the remote branch's
 * current state rather than whatever the local branch of that name points at.
 *
 * Examples:
 *   git-toolbox todos
 *   git-toolbox todos --against develop
 *   git-toolbox todos --against develop --remote upstream
 */
export function registerTodos(program: Command): void {
  program
    .command("todos")
    .description("List TODO comments added on this branch vs. another branch.")
    .option(
      "--against <branch>",
      "branch to diff against (defaults to the last branch used, then 'main'/'master')",
    )
    .option(
      "--remote <remote>",
      "remote whose copy of the branch to diff against (defaults to the last remote used, then 'origin')",
    )
    .addHelpText("after", branchMemoryHelpText("todos"))
    .action((options: { against?: string; remote?: string }) => {
      const cwd = repoRoot();
      const remote = options.remote ?? getLastRemote(cwd, "todos") ?? "origin";
      const against =
        options.against ?? getLastAgainst(cwd, "todos") ?? mainOrMasterBranch(cwd, remote);

      if (!against) {
        throw new UsageError(
          "Could not determine a branch to diff against (no remembered branch, and " +
            `neither 'main' nor 'master' exists on '${remote}'); pass --against <branch>.`,
        );
      }

      if (options.against) {
        setLastAgainst(cwd, "todos", options.against);
      }
      if (options.remote) {
        setLastRemote(cwd, "todos", options.remote);
      }

      const remoteRef = fetchRemoteRef(cwd, remote, against);
      const diff = diffAgainstWorkingTree(cwd, remoteRef, ["--unified=0"]);
      const todosByFile = extractAddedTodos(diff);
      const files = Object.keys(todosByFile);

      if (files.length === 0) {
        console.log(`No added TODOs found vs '${remoteRef}'.`);
        return;
      }

      console.log(`Added TODOs vs '${remoteRef}':\n`);
      for (const file of files) {
        console.log(`${file}:`);
        for (const todo of todosByFile[file] ?? []) console.log(`  - ${todo}`);
        console.log();
      }
    });
}
