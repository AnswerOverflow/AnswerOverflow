import { omit, pick } from "./select";
import { describe, it, expect } from "bun:test";

describe("Pick", () => {
  it("should pick the correct keys", () => {
    const toPick = {
      a: 1,
      b: 2,
      c: 3,
    };
    const picked = pick(toPick, "a", "c");
    expect(picked).toEqual({
      a: 1,
      c: 3,
    });
  });
});

describe("Omit", () => {
  it("should omit the correct keys", () => {
    const toOmit = {
      a: 1,
      b: 2,
      c: 3,
    };
    const omitted = omit(toOmit, "a", "c");
    expect(omitted).toEqual({
      b: 2,
    });
  });
});
