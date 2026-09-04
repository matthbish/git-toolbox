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

| Command                    | What it does                                                                               |
| -------------------------- | ------------------------------------------------------------------------------------------ |
| `push <message>`           | Stage all changes, commit, and push the current branch (auto-sets upstream on first push). |
| `pull`                     | Fetch from origin and pull the current branch.                                             |
| `amend`                    | Stage changes, amend the last commit, and force-push (`--force-with-lease`).               |
| `squash <count> <message>` | Squash the last `<count>` commits into one and force-push.                                 |
| `clean-branches <prefix>`  | Delete local branches whose name starts with `<prefix>`.                                   |
| `diff-export`              | Save the diff against another branch to a `.patch` file.                                   |
| `todos`                    | List TODO comments added on this branch vs. another branch.                                |

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

`diff-export` and `todos` diff against the repository's detected default
branch (via `origin/HEAD`) unless you pass `--against <branch>`.

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

The test suite creates disposable local git repositories (with a bare
"origin" remote) under your OS temp directory for each test and exercises
the built commands against them — no network access or real repository is
touched.

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
