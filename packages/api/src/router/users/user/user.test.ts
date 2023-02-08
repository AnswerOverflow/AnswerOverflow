import { getRandomId } from "@answeroverflow/utils";
import { createContextInner } from "~api/router/context";
import { userRouter } from "./user";

// eslint-disable-next-line no-unused-vars
let users: ReturnType<(typeof userRouter)["createCaller"]>;
beforeEach(async () => {
  const a = await createContextInner({
    session: null,
    source: "discord-bot",
    userServers: [],
  });
  users = userRouter.createCaller(a);
});

describe("userRouter", () => {
  it("should create a user", async () => {
    const newUser = await users.upsert({
      name: "test",
      id: getRandomId(),
    });
    expect(newUser).toBeDefined();
    expect(newUser.name).toBe("test");
  });
  it("should find a user by id", async () => {
    const id = getRandomId();
    const user = await users.byId(id);
    expect(user).toBeNull();
    const newUser = await users.upsert({
      name: "test",
      id,
    });
    expect(newUser).toBeDefined();
    expect(newUser.name).toBe("test");
    const foundUser = await users.byId(id);
    expect(foundUser).toBeDefined();
    expect(foundUser!.name).toBe("test");
  });
});
