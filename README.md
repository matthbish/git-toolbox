# git-toolbox

A small, focused CLI of everyday git workflow shortcuts — stage-commit-push,
amend-and-force-push, squash, branch cleanup, diff export, and a TODO
finder — as one command instead of three or four.

Built with TypeScript, ships as a single Node.js CLI, works on Windows,
macOS, and Linux.

## Install

```bash
npm install -g @matthbish/git-toolbox
```

This installs the `git-toolbox` command. Because the binary is named
`git-toolbox`, git itself also recognizes it as a custom subcommand, so
`git toolbox <command>` works too.

The installer also tries to set up a short `gtx` alias for global installs.
It only creates `gtx` if that name is free; if something else on your
system already uses it, install leaves it alone and prints a note — your
`git-toolbox` / `git toolbox` commands work either way.

Note: `npm uninstall -g` does not run cleanup scripts for global packages
(this is standard npm behavior, not specific to this package), so the
`gtx` shim isn't automatically removed when you uninstall. It becomes
inert once `git-toolbox` itself is gone — running it just fails — and you
can delete it yourself from npm's global bin directory (`npm config get
prefix`) if you want it gone entirely.

## Quick start

```bash
git-toolbox push "fix pagination bug"
# equivalent to: git toolbox push "fix pagination bug"
# equivalent to: gtx push "fix pagination bug"   (if the alias was set up)
```

That stages every change, commits it, and pushes the current branch —
setting the upstream automatically the first time.

## Commands

| Command                    | What it does                                                                                                                  |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `push <message>`           | Stage all changes, commit, and push the current branch (auto-sets upstream on first push).                                    |
| `pull`                     | Fetch from origin and pull the current branch.                                                                                |
| `amend`                    | Stage changes, amend the last commit, and force-push (`--force-with-lease`).                                                  |
| `squash <count> <message>` | Squash the last `<count>` commits into one and force-push.                                                                    |
| `clean-branches <prefix>`  | Delete local branches whose name starts with `<prefix>`.                                                                      |
| `diff-export`              | Save the diff against another branch to a `.patch` file, including uncommitted changes. Remembers `--against` (see below).    |
| `todos`                    | List TODO comments added on this branch vs. another branch, including uncommitted changes. Remembers `--against` (see below). |

Every command supports `--help` for its full option list, e.g.
`git-toolbox squash --help`.

### Examples

```bash
# Quick commit + push
git-toolbox push "add retry logic"

# Fix up the last commit and force-push it
git-toolbox amend --message "clearer message"

# Combine the last 4 commits into one before opening a PR
git-toolbox squash 4 "implement search endpoint"

# Clean up local review branches, previewing first
git-toolbox clean-branches review- --dry-run
git-toolbox clean-branches review-

# Export what this branch changed relative to release/2.0
git-toolbox diff-export --against release/2.0 --out release.patch

# Check for TODOs you're about to ship
git-toolbox todos
```

`diff-export` and `todos` both take an optional `--against <branch>` and
resolve which branch to diff against in this order. In both cases the diff
covers everything on top of that branch: commits (pushed or not), staged
changes, and unstaged changes in the working tree.

1. `--against <branch>`, if you pass it — this is also remembered as that
   command's default for next time.
2. The branch you last passed to `--against` for that command, in this
   repository (see "Branch memory" below).
3. `main`, if it exists (checked locally, then as `origin/main`);
   otherwise `master`.

If none of those resolve to anything, the command exits with an error
telling you to pass `--against <branch>`.

### Branch memory

`diff-export` and `todos` each remember, per repository, the last branch
you explicitly passed to `--against` — so once you've run e.g.
`git-toolbox todos --against release/2.0`, later runs of `git-toolbox
todos` in that repo reuse `release/2.0` without you typing it again.

This is stored in a plain JSON file, `.git/git-toolbox-state.json`, next
to the rest of git's own local, untracked state:

```json
{
  "lastAgainstByCommand": {
    "todos": "release/2.0",
    "diff-export": "develop"
  }
}
```

It's per-repository and never committed (it lives inside `.git`, which
git itself never tracks), and per-command — `diff-export` and `todos`
remember their own choice of `--against` independently. This works
identically no matter how `git-toolbox` itself is installed (`npm
install -g`, `npx`, or run from a source checkout): the file always
lives inside the repository you're _running the command in_, not
wherever the tool is installed.

To view, change, or reset the remembered branch:

```bash
# View it
cat .git/git-toolbox-state.json

# Change it: just pass --against again, it's remembered automatically
git-toolbox todos --against develop

# Reset it: delete the command's key (or the whole file) by hand, or:
git-toolbox todos --against main   # explicitly overwrite it
rm .git/git-toolbox-state.json     # or wipe all remembered branches
```

Once nothing is remembered, `todos`/`diff-export` fall back to `main`/
`master` as described above. Run `git-toolbox todos --help` or
`git-toolbox diff-export --help` for this same summary at the command
line.

### A note on the history-rewriting commands

`amend` and `squash` force-push (using `--force-with-lease`, which refuses
to overwrite work you haven't seen). Only use them on branches you're not
sharing with someone who has already pulled the commits you're about to
rewrite.

## Supported platforms

Windows, macOS, and Linux, on Node.js 18+. All commands shell out to the
`git` binary, which must be installed and on your `PATH`.

## Development

```bash
git clone https://github.com/matthbish/git-toolbox.git
cd git-toolbox
npm install
npm run dev -- push "test commit"   # run the CLI from source via tsx
npm run build                        # bundle to dist/
```

### Testing

```bash
npm test
```

`npm test` first runs `npm run build` (via the `pretest` script), then
runs the suite. Most tests run the TypeScript source directly via `tsx`;
a few specifically run the built `dist/index.js` with plain `node` — the
same way a real `npm install -g` invokes the `git-toolbox` bin — to catch
anything that only breaks in the built artifact. All of them create
disposable local git repositories (with a bare "origin" remote) under
your OS temp directory for each test and exercise commands against those
— no network access or real repository is touched.

### Linting, formatting, and type checking

```bash
npm run lint
npm run format
npm run typecheck
```

## Contributing

Issues and pull requests are welcome. For any change that should be
published, add a changeset before opening the PR:

```bash
npx changeset
```

CI runs lint, type-check, build, and tests on Windows, macOS, and Linux for
every push and pull request. Merges to `main` are handled by
[changesets](https://github.com/changesets/changesets): pending changesets
are batched into a "Version Packages" PR, and merging that PR publishes the
new version to npm.

## License

[MIT](LICENSE)
