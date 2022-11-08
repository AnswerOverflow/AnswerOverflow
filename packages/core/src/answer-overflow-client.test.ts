import { AnswerOverflowClient } from "./answer-overflow-client";

describe("Client Tests", () => {
  it("Creates an Answer Overflow client", async () => {
    const client = new AnswerOverflowClient();
    expect(client).toBeDefined();
    const resp = await client.elastic.ping();
    expect(resp).toBeTruthy();
    //const users = await client.prisma.user.findMany();
  });
});
