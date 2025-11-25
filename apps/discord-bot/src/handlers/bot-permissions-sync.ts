import { Database } from "@packages/database/database";
import { Console, Effect, Layer } from "effect";
import { Discord } from "../core/discord-service";
import { isAllowedRootChannelType } from "../utils/conversions";
import { syncBotPermissionsForChannel } from "./channel-parity";

function syncBotPermissionsForAllChannelsInGuild(
	discord: Effect.Effect.Success<typeof Discord>,
	database: Effect.Effect.Success<typeof Database>,
	guildId: string,
) {
	return Effect.gen(function* () {
		const channels = yield* discord.getChannels(guildId);
		const rootChannels = channels.filter((channel) => {
			if (!("guild" in channel) || !channel.guild) return false;
			if (!("type" in channel)) return false;
			return isAllowedRootChannelType(channel.type);
		});

		yield* Effect.forEach(
			rootChannels,
			(channel) =>
				syncBotPermissionsForChannel(discord, database, channel.id, guildId),
			{ concurrency: 5 },
		);

		yield* Console.log(
			`Synced bot permissions for ${rootChannels.length} channels in guild ${guildId}`,
		);
	}).pipe(
		Effect.catchAll((error) =>
			Console.warn(
				`Failed to sync bot permissions for guild ${guildId}:`,
				error,
			),
		),
	);
}

export const BotPermissionsSyncLayer = Layer.scopedDiscard(
	Effect.gen(function* () {
		const discord = yield* Discord;
		const database = yield* Database;

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

				yield* syncBotPermissionsForAllChannelsInGuild(
					discord,
					database,
					newMember.guild.id,
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

				yield* syncBotPermissionsForAllChannelsInGuild(
					discord,
					database,
					newRole.guild.id,
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
