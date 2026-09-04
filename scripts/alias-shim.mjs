// Shared helpers for the postinstall/preuninstall alias scripts.
//
// git-toolbox's real bin name is `git-toolbox`, declared normally in
// package.json, so npm's own installer manages it — including conflict
// handling — with no custom code needed.
//
// `gtx` is an extra, even-shorter alias. Because a bare word like `gtx`
// is far more likely to collide with something else the user has installed
// globally, it is NOT declared in package.json's "bin" field (npm would
// silently overwrite a same-named shim from another package with no way for
// us to detect or warn about it). Instead these scripts create/remove it by
// hand, only ever touching a file that either doesn't exist yet or was
// clearly created by this same script before (marked with ALIAS_MARKER).

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync, chmodSync } from "node:fs";
import { dirname, join } from "node:path";
import { execFileSync } from "node:child_process";

export const ALIAS_MARKER = "git-toolbox-alias-v1";
const ALIAS_NAME = "gtx";
const REAL_BIN_NAME = "git-toolbox";

function isGlobalInstall() {
  return process.env.npm_config_global === "true";
}

/**
 * Resolves npm's global bin/shim directory, or undefined if it can't be
 * determined. Prefers `npm_config_prefix`, which npm sets in the environment
 * of every lifecycle script (including this one) — reading it avoids
 * shelling out to `npm` itself, which on Windows is a `.cmd` file and can
 * fail to spawn without a shell if the environment's PATHEXT is unusual.
 */
function resolveGlobalBinDir() {
  const prefix = process.env.npm_config_prefix ?? execNpmPrefixFallback();
  if (!prefix) return undefined;

  // npm's global bin/shim directory is <prefix>/bin on posix, and <prefix>
  // itself on win32.
  const binDir = process.platform === "win32" ? prefix : join(prefix, "bin");
  return existsSync(binDir) ? binDir : undefined;
}

function execNpmPrefixFallback() {
  try {
    const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
    return execFileSync(npmCommand, ["config", "get", "prefix"], { encoding: "utf-8" }).trim();
  } catch {
    return undefined;
  }
}

/**
 * On Windows, both a `.cmd` shim (for cmd.exe / PowerShell) and a plain
 * extensionless shim (for Git Bash / WSL / MSYS running against the same
 * npm prefix) are created, mirroring the pair npm itself generates for
 * `git-toolbox`. Elsewhere, just the plain POSIX shim.
 */
function aliasTargets(binDir) {
  const posix = { path: join(binDir, ALIAS_NAME), content: posixShimContent(), executable: true };
  if (process.platform === "win32") {
    const cmd = {
      path: join(binDir, `${ALIAS_NAME}.cmd`),
      content: windowsShimContent(),
      executable: false,
    };
    return [cmd, posix];
  }
  return [posix];
}

function ownedByUs(path) {
  if (!existsSync(path)) return "absent";
  try {
    return readFileSync(path, "utf-8").includes(ALIAS_MARKER) ? "ours" : "foreign";
  } catch {
    return "foreign";
  }
}

function posixShimContent() {
  return `#!/bin/sh\n# ${ALIAS_MARKER}\nexec "$(dirname "$0")/${REAL_BIN_NAME}" "$@"\n`;
}

function windowsShimContent() {
  return `@ECHO off\r\nREM ${ALIAS_MARKER}\r\n"%~dp0${REAL_BIN_NAME}.cmd" %*\r\n`;
}

export function installAlias() {
  if (!isGlobalInstall()) return;

  try {
    const binDir = resolveGlobalBinDir();
    if (!binDir) {
      console.log("git-toolbox: could not locate the global bin directory; skipping 'gtx' alias.");
      return;
    }

    const realBin = join(
      binDir,
      process.platform === "win32" ? `${REAL_BIN_NAME}.cmd` : REAL_BIN_NAME,
    );
    if (!existsSync(realBin)) {
      // npm hasn't linked our own bin yet (unexpected install order) — don't guess.
      return;
    }

    let installedAny = false;
    for (const target of aliasTargets(binDir)) {
      const status = ownedByUs(target.path);
      if (status === "foreign") {
        console.log(
          `git-toolbox: '${ALIAS_NAME}' is already used by another tool at ${target.path}; skipping that alias. ` +
            `Use 'git-toolbox' or 'git toolbox' instead.`,
        );
        continue;
      }

      mkdirSync(dirname(target.path), { recursive: true });
      writeFileSync(target.path, target.content);
      if (target.executable) chmodSync(target.path, 0o755);
      installedAny = true;
    }

    if (installedAny) {
      console.log(
        `git-toolbox: installed '${ALIAS_NAME}' as a short alias for '${REAL_BIN_NAME}'.`,
      );
    }
  } catch (err) {
    // Never fail the install over an optional convenience alias.
    console.log(
      `git-toolbox: skipping 'gtx' alias (${err instanceof Error ? err.message : String(err)}).`,
    );
  }
}

export function uninstallAlias() {
  if (!isGlobalInstall()) return;

  try {
    const binDir = resolveGlobalBinDir();
    if (!binDir) return;

    for (const target of aliasTargets(binDir)) {
      if (ownedByUs(target.path) === "ours") {
        rmSync(target.path, { force: true });
      }
    }
  } catch {
    // Best-effort cleanup only.
  }
}
