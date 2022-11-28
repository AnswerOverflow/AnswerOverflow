import { createContextInner } from "../../context";
import { userRouter } from "./user";

// eslint-disable-next-line no-unused-vars
let users: ReturnType<typeof userRouter["createCaller"]>;
beforeAll(async () => {
  const a = await createContextInner({
    session: null,
  });
  users = userRouter.createCaller(a);
});

describe("userRouter", () => {
  it("should create a user", async () => {
    const new_user = await users.create({
      name: "test",
      id: "1",
    });
    expect(new_user).toBeDefined();
    expect(new_user.name).toBe("test");
  });
  it("should find a user by id", async () => {
    const user = await users.byId("1");
    expect(user).toBeDefined();
    expect(user!.name).toBe("test");
  });
});
