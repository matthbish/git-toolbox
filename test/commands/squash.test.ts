import { describe, it, expect } from "vitest";
import { parseSquashCount } from "../../src/commands/squash.js";
import { UsageError } from "../../src/lib/errors.js";

describe("parseSquashCount", () => {
  it("accepts a valid count within range", () => {
    expect(parseSquashCount("3", 5)).toBe(3);
  });

  it("rejects counts below 2", () => {
    expect(() => parseSquashCount("1", 5)).toThrow(UsageError);
    expect(() => parseSquashCount("0", 5)).toThrow(UsageError);
  });

  it("rejects counts greater than the number of commits", () => {
    expect(() => parseSquashCount("6", 5)).toThrow(UsageError);
  });

  it("rejects non-numeric input", () => {
    expect(() => parseSquashCount("abc", 5)).toThrow(UsageError);
  });

  it("rejects decimal input", () => {
    expect(() => parseSquashCount("2.5", 5)).toThrow(UsageError);
  });
});
