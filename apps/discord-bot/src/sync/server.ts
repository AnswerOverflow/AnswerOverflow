import { Database } from "@packages/database/database";
import { Storage } from "@packages/database/storage";
import { getBaseUrl } from "@packages/ui/utils/links";
import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ChannelType,
	EmbedBuilder,
	type Guild,
} from "discord.js";
import { Array as Arr, Console, Effect, Layer, Metric } from "effect";
import { registerCommands } from "../commands/register";
import { SUPER_USER_ID } from "../constants/super-user";
import { Discord } from "../core/discord-service";
import { activeGuilds, syncOperations } from "../metrics";
import {
	registerServerGroup,
	trackServerJoin,
	trackServerLeave,
} from "../utils/analytics";
import { isAllowedRootChannelType } from "../utils/conversions";
import { leaveServerIfNecessary } from "../utils/denylist";
import {
	catchAllSilentWithReport,
	catchAllWithReport,
} from "../utils/error-reporting";
import { syncChannel } from "./channel";

function makeGuildEmbed(guild: Guild, joined: boolean) {
	const numberOfForumChannels = (
		guild.channels?.cache?.filter((c) => c.type === ChannelType.GuildForum)
			?.size ?? 0
	).toString();

	return new EmbedBuilder()
		.setTitle(joined ? "Joined Server" : "Left Server")
		.setDescription(
			joined ? `Joined server ${guild.name}` : `Left server ${guild.name}`,
		)
		.setThumbnail(guild.iconURL())
		.setTimestamp()
		.setColor(joined ? "Green" : "Red")
		.setImage(guild.bannerURL() ?? guild.splashURL())
		.setFields([
			{
				name: "Members",
				value: (guild.memberCount ?? 0).toString(),
				inline: true,
			},
			{
				name: "Forum Channels",
				value: numberOfForumChannels,
				inline: true,
			},
			{
				name: "Age",
				value: guild.createdAt?.toDateString() ?? "Unknown",
				inline: false,
			},
			{
				name: "Id",
				value: guild.id,
				inline: false,
			},
		]);
}

function notifySuperUserOfServerJoin(guild: Guild) {
	return Effect.gen(function* () {
		const discord = yield* Discord;

		yield* discord
			.callClient(async () => {
				const superUser = await guild.client.users.fetch(SUPER_USER_ID);
				await superUser.send({ embeds: [makeGuildEmbed(guild, true)] });
			})
			.pipe(
				catchAllWithReport((error) =>
					Console.error("Failed to notify super user of server join:", error),
				),
			);
	});
}

const RHYS_AVATAR_URL =
	"https://cdn.discordapp.com/avatars/523949187663134754/7716e305f7de26045526d9da6eef2dab.webp";

function getPacificAvailabilityTimestamps() {
	const today = new Date().toLocaleDateString("en-CA", {
		timeZone: "America/Los_Angeles",
	});
	const start = new Date(`${today}T08:00:00-08:00`);
	const end = new Date(`${today}T22:00:00-08:00`);

	return {
		start: Math.floor(start.getTime() / 1000),
		end: Math.floor(end.getTime() / 1000),
	};
}

function notifyUserWhoAddedBot(guild: Guild) {
	return Effect.gen(function* () {
		yield* Effect.annotateCurrentSpan({
			guild_id: guild.id,
			guild_name: guild.name,
		});

		const database = yield* Database;
		const discord = yield* Discord;

		const preferences =
			yield* database.private.server_preferences.getServerPreferencesByServerId(
				{
					serverId: BigInt(guild.id),
				},
			);

		if (!preferences?.addedByUserId) {
			yield* Effect.annotateCurrentSpan({
				skipped: true,
				reason: "no_added_by_user_id",
			});
			return;
		}

		const addedByUserId = preferences.addedByUserId.toString();
		const { start, end } = getPacificAvailabilityTimestamps();
		const botId = guild.client.user?.id;

		yield* Effect.annotateCurrentSpan({ target_user_id: addedByUserId });

		yield* discord.callClient(async () => {
			const user = await guild.client.users.fetch(addedByUserId);

			const botMention = botId ? `<@${botId}>` : "the bot";
			const embed = new EmbedBuilder()
				.setColor("#5865F2")
				.setAuthor({
					name: "Rhys",
					iconURL: RHYS_AVATAR_URL,
				})
				.setDescription(
					`Hey! Thanks for adding Answer Overflow to **${guild.name}**!\n\n` +
						`If you need any help with setup, have any bugs, feedback, or feature requests just DM ${botMention} - it comes straight to me.\n\n` +
						`I'm usually available <t:${start}:t> - <t:${end}:t>, so if I don't respond right away, I'll get back to you as soon as I can!`,
				)
				.setTimestamp();

			const setupButton = new ButtonBuilder()
				.setLabel("Continue Setup")
				.setStyle(ButtonStyle.Link)
				.setURL(`${getBaseUrl()}/dashboard/${guild.id}/onboarding/configure`);

			const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
				setupButton,
			);

			await user.send({ embeds: [embed], components: [actionRow] });
		});

		yield* Console.log(
			`Sent welcome DM to user ${addedByUserId} for server ${guild.name}`,
		);
	}).pipe(Effect.withSpan("notify_user_who_added_bot"));
}

const VANITY_INVITE_OVERRIDES: Record<string, string> = {
	"1399423718626951168": "pokemongocoordinates",
};

function toAOServer(guild: Guild) {
	return Effect.gen(function* () {
		yield* Effect.annotateCurrentSpan({
			"discord.guild_id": guild.id,
			"discord.guild_name": guild.name,
		});

		const vanityInviteCode =
			VANITY_INVITE_OVERRIDES[guild.id] ?? guild.vanityURLCode ?? undefined;
		return {
			discordId: BigInt(guild.id),
			name: guild.name,
			icon: guild.icon ? guild.icon.toString() : undefined,
			banner: guild.banner ? guild.banner.toString() : undefined,
			description: guild.description ?? undefined,
			vanityInviteCode,
			approximateMemberCount:
				guild.approximateMemberCount ?? guild.memberCount ?? 0,
		};
	}).pipe(Effect.withSpan("sync.server.to_ao_server"));
}

export function syncGuild(guild: Guild) {
	return Effect.gen(function* () {
		yield* Effect.annotateCurrentSpan({
			"discord.guild_id": guild.id,
			"discord.guild_name": guild.name,
		});
		yield* Metric.increment(syncOperations);

		const database = yield* Database;

		yield* Console.log(`Syncing server ${guild.id} ${guild.name}`);

		const aoServerData = yield* toAOServer(guild);
		const { isNew } =
			yield* database.private.servers.upsertServer(aoServerData);

		if (isNew) {
			yield* catchAllSilentWithReport(
				registerServerGroup({
					"Server Id": guild.id,
					"Server Name": guild.name,
				}),
			);

			yield* database.private.server_preferences.updateServerPreferences({
				serverId: BigInt(guild.id),
				preferences: {},
			});
		}

		const preferencesLiveData =
			yield* database.private.server_preferences.getServerPreferencesByServerId(
				{
					serverId: BigInt(guild.id),
				},
			);
		const preferences = preferencesLiveData;
		if (preferences?.customDomain && guild.icon) {
			const storage = yield* Storage;
			yield* storage
				.uploadFileFromUrl({
					id: `${guild.id}/${guild.icon}`,
					filename: "icon.png",
					contentType: "image/png",
					url: `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=48`,
				})
				.pipe(
					Effect.tap(() =>
						Console.log(
							`Uploaded server icon for ${guild.name} (custom domain: ${preferences.customDomain})`,
						),
					),
					catchAllWithReport((error) =>
						Console.warn(
							`Failed to upload server icon for ${guild.name}:`,
							error,
						),
					),
				);
		}

		if (guild.banner) {
			const storage = yield* Storage;
			const isAnimated = guild.banner.startsWith("a_");
			const extension = isAnimated ? "gif" : "png";
			const contentType = isAnimated ? "image/gif" : "image/png";

			yield* storage
				.uploadFileFromUrl({
					id: `${guild.id}/${guild.banner}`,
					filename: `banner.${extension}`,
					contentType,
					url: `https://cdn.discordapp.com/banners/${guild.id}/${guild.banner}.${extension}?size=4096`,
				})
				.pipe(
					Effect.tap(() =>
						Console.log(`Uploaded server banner for ${guild.name}`),
					),
					catchAllWithReport((error) =>
						Console.warn(
							`Failed to upload server banner for ${guild.name}:`,
							error,
						),
					),
				);
		}

		const channels = Arr.fromIterable(guild.channels.cache.values());
		const rootChannels = channels.filter((channel) => {
			return isAllowedRootChannelType(channel.type);
		});

		yield* Effect.forEach(rootChannels, (channel) => syncChannel(channel));
	}).pipe(
		Effect.withSpan("sync.guild"),
		catchAllWithReport((error) =>
			Console.error(`Error syncing guild ${guild.id}:`, error),
		),
	);
}

export const ServerParityLayer = Layer.scopedDiscard(
	Effect.gen(function* () {
		const discord = yield* Discord;
		const database = yield* Database;

		yield* discord.client.on("guildCreate", (guild) =>
			Effect.gen(function* () {
				yield* Effect.annotateCurrentSpan({
					"discord.guild_id": guild.id,
					"discord.guild_name": guild.name,
				});
				yield* Metric.incrementBy(activeGuilds, 1);

				yield* Console.log(`Bot joined server: ${guild.name} (${guild.id})`);

				const leftServer = yield* leaveServerIfNecessary(guild);
				if (leftServer) {
					return;
				}

				yield* Effect.forkDaemon(syncGuild(guild));
				yield* Effect.forkDaemon(
					catchAllSilentWithReport(trackServerJoin(guild)),
				);
				yield* Effect.forkDaemon(
					catchAllSilentWithReport(notifySuperUserOfServerJoin(guild)),
				);
				yield* Effect.forkDaemon(
					catchAllSilentWithReport(notifyUserWhoAddedBot(guild)),
				);
				yield* Effect.forkDaemon(
					catchAllSilentWithReport(
						database.private.servers.scheduleRecommendedConfigurationCache({
							serverId: BigInt(guild.id),
						}),
					),
				);
			}).pipe(
				Effect.withSpan("event.guild_create"),
				catchAllWithReport((error) =>
					Console.error(`Error handling guild create ${guild.id}:`, error),
				),
			),
		);

		yield* discord.client.on("guildUpdate", (_oldGuild, newGuild) =>
			Effect.gen(function* () {
				yield* Effect.annotateCurrentSpan({
					"discord.guild_id": newGuild.id,
					"discord.guild_name": newGuild.name,
				});
				yield* syncGuild(newGuild);
			}).pipe(
				Effect.withSpan("event.guild_update"),
				catchAllWithReport((error) =>
					Console.error(`Error updating guild ${newGuild.id}:`, error),
				),
			),
		);

		yield* discord.client.on("guildDelete", (guild) =>
			Effect.gen(function* () {
				yield* Effect.annotateCurrentSpan({
					"discord.guild_id": guild.id,
					"discord.guild_name": guild.name,
				});
				yield* Metric.incrementBy(activeGuilds, -1);

				const db = yield* Database;
				const discord = yield* Discord;
				yield* db.private.servers.updateServer({
					serverId: BigInt(guild.id),
					server: {
						kickedTime: Date.now(),
					},
				});
				yield* catchAllSilentWithReport(trackServerLeave(guild));
				yield* discord
					.callClient(async () => {
						const superUser = await guild.client.users.fetch(SUPER_USER_ID);
						await superUser.send({ embeds: [makeGuildEmbed(guild, false)] });
					})
					.pipe(
						catchAllWithReport((error) =>
							Console.error(
								"Failed to notify super user of server leave:",
								error,
							),
						),
					);
			}).pipe(
				Effect.withSpan("event.guild_delete"),
				catchAllWithReport((error) =>
					Console.error(`Error handling guild delete ${guild.id}:`, error),
				),
			),
		);

		yield* discord.client.on("clientReady", (client) =>
			Effect.gen(function* () {
				yield* Effect.annotateCurrentSpan({
					"discord.bot_user_id": client.user.id,
					"discord.bot_user_tag": client.user.tag,
				});

				yield* registerCommands().pipe(
					catchAllWithReport((error) =>
						Console.error("Error registering commands:", error),
					),
				);

				const servers = yield* database.private.servers.getAllServers();
				const serverCount = servers?.length ?? 0;
				yield* Console.log(
					`Logged in as ${client.user.tag}! ${serverCount} servers`,
				);
				const guilds = yield* discord.getGuilds();
				const activeServerIds = new Set(guilds.map((guild) => guild.id));

				yield* Effect.annotateCurrentSpan({
					"servers.total": serverCount.toString(),
					"servers.active": activeServerIds.size.toString(),
				});

				yield* Console.table([
					{
						"Total Servers": serverCount,
						"Active Servers": activeServerIds.size,
					},
				]);

				const allServers = servers ?? [];

				const serversToMarkAsKicked = allServers.filter(
					(server) =>
						!activeServerIds.has(server.discordId.toString()) &&
						!server.kickedTime,
				);

				if (serversToMarkAsKicked.length > 0) {
					yield* Effect.annotateCurrentSpan({
						"servers.to_mark_kicked": serversToMarkAsKicked.length.toString(),
					});
					yield* Console.log(
						`Marking ${serversToMarkAsKicked.length} servers as kicked`,
					);
					yield* Effect.forEach(serversToMarkAsKicked, (server) =>
						Effect.gen(function* () {
							yield* database.private.servers.updateServer({
								serverId: server.discordId,
								server: {
									kickedTime: Date.now(),
								},
							});
							yield* Console.log(`Marked server ${server.name} as kicked`);
						}).pipe(
							catchAllWithReport((error) =>
								Console.error(
									`Error marking server ${server.discordId} as kicked:`,
									error,
								),
							),
						),
					);
				}
			}).pipe(Effect.withSpan("event.client_ready")),
		);
	}),
);
