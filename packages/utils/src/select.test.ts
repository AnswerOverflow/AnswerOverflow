import { omit, pick } from "./select";

describe("Pick", () => {
  it("should pick the correct keys", () => {
    const to_pick = {
      a: 1,
      b: 2,
      c: 3,
    };
    const picked = pick(to_pick, ["a", "c"]);
    expect(picked).toEqual({
      a: 1,
      c: 3,
    });
  });
});

describe("Omit", () => {
  it("should omit the correct keys", () => {
    const to_omit = {
      a: 1,
      b: 2,
      c: 3,
    };
    const omitted = omit(to_omit, "a", "c");
    expect(omitted).toEqual({
      b: 2,
    });
  });
});
