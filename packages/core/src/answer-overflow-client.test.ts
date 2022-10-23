import { AnswerOverflowClient } from "./answer-overflow-client";

describe("Client Tests", () => {
  it("Creates an Answer Overflow client", async () => {
    const client = new AnswerOverflowClient();
    expect(client).toBeDefined();
    console.log(process.env.DATABASE_URL);
    const users = await client.prisma.user.findMany();
    console.log(users);
  });
});
