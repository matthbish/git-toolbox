# Changesets

This directory holds pending changesets — see https://github.com/changesets/changesets.

For each pull request that changes published behavior, run:

```bash
npx changeset
```

and commit the generated file. On merge to `main`, CI opens or updates a
"Version Packages" PR; merging that PR publishes the new version to npm.
