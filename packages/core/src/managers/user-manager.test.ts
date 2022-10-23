import { UserManager } from "./user-manager";

describe("User", () => {
  it("Creates a new user", () => {
    const user_manager = new UserManager();
    expect(user_manager.get("1")!.id).toEqual("1");
  });
});
