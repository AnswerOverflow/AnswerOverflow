import { User } from "./user";

describe("User", () => {
  it("Creates a new user", () => {
    const user = new User();
    expect(user).toBeDefined();
    expect(user.id).toEqual("1");
  });
});
