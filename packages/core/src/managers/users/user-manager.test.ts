import { AnswerOverflowClient } from "../../answer-overflow-client";

let answer_overflow_client: AnswerOverflowClient;

beforeAll(() => {
  answer_overflow_client = new AnswerOverflowClient();
});

describe("User", () => {
  it("Creates a new user", async () => {
    const email = "rhys@example.com";
    const name = "Rhys";
    const new_user = await answer_overflow_client.users.create({
      email: email,
      name: name,
    });
    expect(new_user).toBeDefined();
    const fetched_user = await answer_overflow_client.users.fetch(new_user.id);
    expect(fetched_user).toBeDefined();
    expect(fetched_user!.email).toEqual(email);
    expect(fetched_user!.name).toEqual(name);
  });
});
