import { login } from "../bot";

beforeEach(async () => {
  await login();
});

describe("Verifies data is synced to the database", () => {
  it("GIVEN a new user and new server THEN mark as consenting successfully", async () => {});
});
