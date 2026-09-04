/** A problem with how the command was invoked (bad args, wrong state to run in). */
export class UsageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UsageError";
  }
}

/** Raised whenever a command needs a git repository but isn't inside one. */
export class NotAGitRepoError extends UsageError {
  constructor() {
    super("Not inside a git repository (or any of its parent directories).");
    this.name = "NotAGitRepoError";
  }
}
