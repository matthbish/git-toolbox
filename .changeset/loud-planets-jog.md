---
"@matthbish/git-toolbox": minor
---

`diff-export` and `todos` now accept a `--remote <remote>` option (remembered per repository like `--against`) and always fetch and diff against the resolved remote's copy of the branch, rather than whatever the local branch of that name points at.

`amend` and `squash` now force-push with a plain `--force` instead of `--force-with-lease`.
