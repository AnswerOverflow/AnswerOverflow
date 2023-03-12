import { prisma } from "@answeroverflow/prisma-types";
import { getRandomId } from "@answeroverflow/utils";
import { mockDiscordAccount } from "@answeroverflow/db-mock";
import { createDiscordAccount } from "./discord-account";
import { _NOT_PROD_createOauthAccountEntry, findDiscordOauthByProviderAccountId } from "./auth";
describe("Auth", () => {
	it("should find a linked discord account auth by id", async () => {
		const discordUserId = getRandomId();

		const user = await prisma.user.create({
			data: {}
		});
		await createDiscordAccount(
			mockDiscordAccount({
				id: discordUserId
			})
		);
		const oauth = await _NOT_PROD_createOauthAccountEntry({
			discordUserId,
			userId: user.id
		});
		const found = await findDiscordOauthByProviderAccountId(discordUserId);
		expect(found).toEqual(oauth);
	});
});
