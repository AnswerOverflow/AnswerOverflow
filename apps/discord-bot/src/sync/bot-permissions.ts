import { Console, Effect, Layer, Metric } from "effect";
import { Discord } from "../core/discord-service";
import { eventsProcessed, syncOperations } from "../metrics";
import { catchAllWithReport } from "../utils/error-reporting";
import { syncChannel } from "./channel";

export const BotPermissionsSyncLayer = Layer.scopedDiscard(
	Effect.gen(function* () {
		const discord = yield* Discord;

		yield* discord.client.on("guildMemberUpdate", (_oldMember, newMember) =>
			Effect.gen(function* () {
				if (!newMember.user) {
					return;
				}

				const botUser = yield* discord.use("get_bot_user", (c) => c.user);
				if (!botUser || newMember.user.id !== botUser.id) {
					return;
				}

				yield* Effect.annotateCurrentSpan({
					"discord.guild_id": newMember.guild.id,
					"discord.guild_name": newMember.guild.name,
					"bot.user_id": botUser.id,
					"channels.count": newMember.guild.channels.cache.size.toString(),
				});
				yield* Metric.increment(eventsProcessed);
				yield* Metric.increment(syncOperations);

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
				Effect.withSpan("event.bot_member_update"),
				catchAllWithReport((error) =>
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

				yield* Effect.annotateCurrentSpan({
					"discord.role_id": newRole.id,
					"discord.role_name": newRole.name,
					"discord.guild_id": newRole.guild.id,
					"discord.guild_name": newRole.guild.name,
					"channels.count": newRole.guild.channels.cache.size.toString(),
				});
				yield* Metric.increment(eventsProcessed);
				yield* Metric.increment(syncOperations);

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
				Effect.withSpan("event.bot_role_update"),
				catchAllWithReport((error) =>
					Console.error(
						`Error syncing bot permissions after role update:`,
						error,
					),
				),
			),
		);
	}),
);
