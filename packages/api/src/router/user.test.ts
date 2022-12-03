import { clearDatabase } from "@testing/utils";
import { createContextInner } from "../context";
import { userRouter } from "./user";

// eslint-disable-next-line no-unused-vars
let users: ReturnType<typeof userRouter["createCaller"]>;
beforeEach(async () => {
  const a = await createContextInner({
    session: null,
    caller: "discord-bot",
    user_servers: [],
  });
  users = userRouter.createCaller(a);
  await clearDatabase();
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
    expect(user).toBeNull();
    const new_user = await users.create({
      name: "test",
      id: "1",
    });
    expect(new_user).toBeDefined();
    expect(new_user.name).toBe("test");
    const found_user = await users.byId("1");
    expect(found_user).toBeDefined();
    expect(found_user!.name).toBe("test");
  });
});
