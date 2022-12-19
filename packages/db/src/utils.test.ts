import { prisma } from "..";
import { clearDatabase } from "./utils";
describe("Utility function tests", () => {
  it("should clear the database", async () => {
    // TODO: Validate all tables are empty
    await prisma.user.create({
      data: {},
    });
    const users = await prisma.user.findMany({});
    expect(users.length).not.toBe(0);
    await clearDatabase();
    const users2 = await prisma.user.findMany({});
    expect(users2.length).toBe(0);
  });
});
