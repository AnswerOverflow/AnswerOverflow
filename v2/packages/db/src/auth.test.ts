import { getRandomId } from "@answeroverflow/utils/id";
import { createDiscordAccount } from "./discord-account";
import {
  _NOT_PROD_createOauthAccountEntry,
  findDiscordOauthByProviderAccountId,
} from "./auth";
import { db } from "./db";
import { mockDiscordAccount } from "../mock";
import { dbUsers } from "./schema";
import { describe, expect, it } from "bun:test";
describe("Auth", () => {
  it("should find a linked discord account auth by id", async () => {
    const discordUserId = getRandomId();

    const USER_ID = getRandomId();
    const USER_EMAIL = `example+${getRandomId()}@example.com`;

    await db.insert(dbUsers).values({
      id: USER_ID,
      email: USER_EMAIL,
    });
    await createDiscordAccount(
      mockDiscordAccount({
        id: discordUserId,
      })
    );
    const oauth = await _NOT_PROD_createOauthAccountEntry({
      discordUserId,
      userId: USER_ID,
    });
    const found = await findDiscordOauthByProviderAccountId(discordUserId);
    expect(found).toEqual(oauth);
  });
});
