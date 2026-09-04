import { describe, it, expect } from "vitest";
import { extractAddedTodos } from "../../src/commands/todos.js";

describe("extractAddedTodos", () => {
  it("collects added TODO lines grouped by file", () => {
    const diff = [
      "diff --git a/src/foo.ts b/src/foo.ts",
      "index 111..222 100644",
      "--- a/src/foo.ts",
      "+++ b/src/foo.ts",
      "@@ -1,0 +2 @@",
      "+// TODO: handle empty input",
      "diff --git a/src/bar.ts b/src/bar.ts",
      "--- a/src/bar.ts",
      "+++ b/src/bar.ts",
      "@@ -1,0 +2 @@",
      "+const x = 1; // TODO clean this up",
    ].join("\n");

    expect(extractAddedTodos(diff)).toEqual({
      "src/foo.ts": ["// TODO: handle empty input"],
      "src/bar.ts": ["const x = 1; // TODO clean this up"],
    });
  });

  it("ignores removed lines and unrelated additions", () => {
    const diff = [
      "diff --git a/src/foo.ts b/src/foo.ts",
      "--- a/src/foo.ts",
      "+++ b/src/foo.ts",
      "-// TODO: old, now removed",
      "+// nothing interesting here",
    ].join("\n");

    expect(extractAddedTodos(diff)).toEqual({});
  });

  it("returns an empty object for an empty diff", () => {
    expect(extractAddedTodos("")).toEqual({});
  });
});
