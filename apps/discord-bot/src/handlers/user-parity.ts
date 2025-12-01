import { Database } from "@packages/database/database";
import { Console, Effect, Layer } from "effect";
import { Discord } from "../core/discord-service";
import { toAODiscordAccount } from "../utils/conversions";

export const UserParityLayer = Layer.scopedDiscard(
	Effect.gen(function* () {
		const discord = yield* Discord;
		const database = yield* Database;

		yield* discord.client.on("userUpdate", (_oldUser, newUser) =>
			Effect.gen(function* () {
				const existing =
					yield* database.private.discord_accounts.getDiscordAccountById({
						id: BigInt(newUser.id),
					});

				if (!existing) {
					return;
				}

				yield* database.private.discord_accounts.upsertDiscordAccount({
					account: toAODiscordAccount(newUser),
				});
			}).pipe(
				Effect.catchAll((error) =>
					Console.error(`Error updating Discord account ${newUser.id}:`, error),
				),
			),
		);
	}),
);
