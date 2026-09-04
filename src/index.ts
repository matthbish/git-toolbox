#!/usr/bin/env node
import { Command } from "commander";
import { createRequire } from "node:module";
import { registerPush } from "./commands/push.js";
import { registerPull } from "./commands/pull.js";
import { registerAmend } from "./commands/amend.js";
import { registerSquash } from "./commands/squash.js";
import { registerCleanBranches } from "./commands/cleanBranches.js";
import { registerDiffExport } from "./commands/diffExport.js";
import { registerTodos } from "./commands/todos.js";
import { CommandError } from "./lib/exec.js";
import { UsageError } from "./lib/errors.js";

const require = createRequire(import.meta.url);
const { version } = require("../package.json") as { version: string };

export function buildProgram(): Command {
  const program = new Command();

  program
    .name("git-toolbox")
    .description(
      "Everyday git workflow shortcuts. Install once, then run either\n" +
        "`git-toolbox <command>` or `git toolbox <command>`.",
    )
    .version(version, "-v, --version")
    .showHelpAfterError("(add --help for additional information)");

  registerPush(program);
  registerPull(program);
  registerAmend(program);
  registerSquash(program);
  registerCleanBranches(program);
  registerDiffExport(program);
  registerTodos(program);

  return program;
}

async function main(): Promise<void> {
  const program = buildProgram();

  try {
    await program.parseAsync(process.argv);
  } catch (err) {
    if (err instanceof UsageError) {
      console.error(`error: ${err.message}`);
      process.exitCode = 2;
    } else if (err instanceof CommandError) {
      console.error(`error: ${err.message}`);
      process.exitCode = 1;
    } else {
      console.error(`error: ${err instanceof Error ? err.message : String(err)}`);
      process.exitCode = 1;
    }
  }
}

main();
