import { prisma } from "./prisma";

describe("Prisma Tests", () => {
  it("should create the prisma client", async () => {
    await prisma.$connect();
    expect(prisma).toBeDefined();
  });
});
