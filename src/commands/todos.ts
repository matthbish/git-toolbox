import { Command } from "commander";
import { repoRoot, defaultRemoteBranch } from "../lib/git.js";
import { run } from "../lib/exec.js";
import { UsageError } from "../lib/errors.js";

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
 * are about to ship.
 *
 * Diffs against the repository's detected default branch unless --against
 * is given.
 *
 * Examples:
 *   git-toolbox todos
 *   git-toolbox todos --against develop
 */
export function registerTodos(program: Command): void {
  program
    .command("todos")
    .description("List TODO comments added on this branch vs. another branch.")
    .option("--against <branch>", "branch to diff against (defaults to the repo's default branch)")
    .action((options: { against?: string }) => {
      const cwd = repoRoot();
      const against = options.against ?? defaultRemoteBranch(cwd);

      if (!against) {
        throw new UsageError(
          "Could not determine the repository's default branch; pass --against <branch>.",
        );
      }

      const diff = run("git", ["diff", `${against}...`, "--unified=0"], { cwd });
      const todosByFile = extractAddedTodos(diff);
      const files = Object.keys(todosByFile);

      if (files.length === 0) {
        console.log(`No added TODOs found vs '${against}'.`);
        return;
      }

      console.log(`Added TODOs vs '${against}':\n`);
      for (const file of files) {
        console.log(`${file}:`);
        for (const todo of todosByFile[file] ?? []) console.log(`  - ${todo}`);
        console.log();
      }
    });
}
