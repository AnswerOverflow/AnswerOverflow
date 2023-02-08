import { getRandomId } from "@answeroverflow/utils";
import { createContextInner } from "~api/router/context";
import { user_router } from "./user";

// eslint-disable-next-line no-unused-vars
let users: ReturnType<(typeof user_router)["createCaller"]>;
beforeEach(async () => {
  const a = await createContextInner({
    session: null,
    source: "discord-bot",
    user_servers: [],
  });
  users = user_router.createCaller(a);
});

describe("userRouter", () => {
  it("should create a user", async () => {
    const new_user = await users.upsert({
      name: "test",
      id: getRandomId(),
    });
    expect(new_user).toBeDefined();
    expect(new_user.name).toBe("test");
  });
  it("should find a user by id", async () => {
    const id = getRandomId();
    const user = await users.byId(id);
    expect(user).toBeNull();
    const new_user = await users.upsert({
      name: "test",
      id,
    });
    expect(new_user).toBeDefined();
    expect(new_user.name).toBe("test");
    const found_user = await users.byId(id);
    expect(found_user).toBeDefined();
    expect(found_user!.name).toBe("test");
  });
});
