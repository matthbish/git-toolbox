import { uninstallAlias } from "./alias-shim.mjs";

// Best-effort only: modern npm does not actually invoke `preuninstall` for
// globally-installed packages (verified — this script does not run on
// `npm uninstall -g`), so this mainly helps on package managers/versions
// that do still call it. See the README for what that means in practice.
uninstallAlias();
