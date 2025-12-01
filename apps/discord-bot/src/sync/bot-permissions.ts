import { Console, Effect, Layer } from "effect";
import { Discord } from "../core/discord-service";
import { syncChannel } from "./channel";

export const BotPermissionsSyncLayer = Layer.scopedDiscard(
	Effect.gen(function* () {
		const discord = yield* Discord;

		yield* discord.client.on("guildMemberUpdate", (_oldMember, newMember) =>
			Effect.gen(function* () {
				if (!newMember.user) {
					return;
				}

				const botUser = yield* discord.use((c) => c.user);
				if (!botUser || newMember.user.id !== botUser.id) {
					return;
				}

				yield* Console.log(
					`Bot permissions updated in guild ${newMember.guild.id}, syncing all channels`,
				);

				yield* Effect.forEach(
					newMember.guild.channels.cache.values(),
					(channel) => syncChannel(channel),
					{
						concurrency: 5,
					},
				);
			}).pipe(
				Effect.catchAll((error) =>
					Console.error(
						`Error syncing bot permissions after member update:`,
						error,
					),
				),
			),
		);

		yield* discord.client.on("roleUpdate", (_oldRole, newRole) =>
			Effect.gen(function* () {
				if (!newRole.guild) {
					return;
				}

				const guild = yield* discord.getGuild(newRole.guild.id);
				if (!guild) {
					return;
				}

				const botMember = guild.members.me;
				if (!botMember) {
					return;
				}

				if (!botMember.roles.cache.has(newRole.id)) {
					return;
				}

				yield* Console.log(
					`Bot role ${newRole.id} updated in guild ${newRole.guild.id}, syncing all channels`,
				);

				yield* Effect.forEach(
					newRole.guild.channels.cache.values(),
					(channel) => syncChannel(channel),
					{
						concurrency: 5,
					},
				);
			}).pipe(
				Effect.catchAll((error) =>
					Console.error(
						`Error syncing bot permissions after role update:`,
						error,
					),
				),
			),
		);
	}),
);
