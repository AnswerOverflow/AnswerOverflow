import { AnswerOverflowClient } from "../../answer-overflow-client";
import { clearDatabase, TEST_USER_1 } from "../../utils/test-constants";

let answer_overflow_client: AnswerOverflowClient;
beforeEach(async () => {
  answer_overflow_client = new AnswerOverflowClient();
  clearDatabase(answer_overflow_client);
});

describe("UserManager", () => {
  test("get", async () => {
    const user = await answer_overflow_client.users.get("1");
    expect(user).toBeNull();
  });
  test("create", async () => {
    const user = await answer_overflow_client.users.create({
      user: TEST_USER_1,
    });
    expect(user).not.toBeNull();
    expect(user.id).toBe(TEST_USER_1.id);
    expect(user.name).toBe(TEST_USER_1.name);
    expect(user.email).toBe(TEST_USER_1.email);
    expect(user.avatar).toBe(TEST_USER_1.avatar);
  });
  test("edit", async () => {
    const user = await answer_overflow_client.users.edit({
      id: "1",
      name: "test",
      avatar: "test",
      email: "test",
    });
    expect(user).toBeInstanceOf(UserExtended);
    expect(user.id).toBe("1");
  }
});
