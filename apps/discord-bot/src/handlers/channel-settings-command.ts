import { Database, DatabaseLayer } from "@packages/database/database";
import type { ChatInputCommandInteraction } from "discord.js";
import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	EmbedBuilder,
	type MessageActionRowComponentBuilder,
} from "discord.js";
import { Console, Effect, Layer } from "effect";
import { Discord } from "../core/discord-service";

function getDashboardUrl(serverId: string, channelId: string): string {
	const baseUrl =
		process.env.NODE_ENV === "development"
			? "http://localhost:3000"
			: "https://app.answeroverflow.com";
	return `${baseUrl}/dashboard/${serverId}/channels?channels=${channelId}`;
}

export function handleChannelSettingsCommand(
	interaction: ChatInputCommandInteraction,
): Effect.Effect<void, unknown, Database> {
	return Effect.gen(function* () {
		const database = yield* Database;

		if (
			!interaction.guildId ||
			!interaction.channelId ||
			!interaction.channel
		) {
			yield* Effect.tryPromise({
				try: () =>
					interaction.reply({
						content: "This command can only be used in a server channel",
						ephemeral: true,
					}),
				catch: () => undefined,
			});
			return;
		}

		const targetChannelId = interaction.channel?.isThread()
			? (interaction.channel.parentId ?? interaction.channelId)
			: interaction.channelId;

		if (!targetChannelId) {
			yield* Effect.tryPromise({
				try: () =>
					interaction.reply({
						content: "Could not determine parent channel",
						ephemeral: true,
					}),
				catch: () => undefined,
			});
			return;
		}

		const serverLiveData = yield* Effect.scoped(
			database.private.servers.getServerByDiscordId({
				discordId: interaction.guildId,
			}),
		);

		const server = serverLiveData;

		if (!server) {
			yield* Effect.tryPromise({
				try: () =>
					interaction.reply({
						content: "Server not found in database",
						ephemeral: true,
					}),
				catch: () => undefined,
			});
			return;
		}

		const channelLiveData = yield* Effect.scoped(
			database.private.channels.findChannelByDiscordId({
				discordId: targetChannelId,
			}),
		);

		if (!channelLiveData) {
			yield* Effect.tryPromise({
				try: () =>
					interaction.reply({
						content: "Channel not found in database",
						ephemeral: true,
					}),
				catch: () => undefined,
			});
			return;
		}

		const dashboardUrl = getDashboardUrl(interaction.guildId, targetChannelId);

		const embed = new EmbedBuilder()
			.setTitle("Channel Settings")
			.setDescription(
				`Configure settings for <#${targetChannelId}> in the dashboard.`,
			)
			.setColor("#89D3F8");

		const actionRow =
			new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
				new ButtonBuilder()
					.setLabel("Open Dashboard")
					.setStyle(ButtonStyle.Link)
					.setURL(dashboardUrl),
			);

		yield* Effect.tryPromise({
			try: () =>
				interaction.reply({
					embeds: [embed],
					components: [actionRow],
					ephemeral: true,
				}),
			catch: (error) => {
				console.error("Error replying to channel-settings command:", error);
				return error;
			},
		});
	});
}

export const ChannelSettingsCommandHandlerLayer = Layer.scopedDiscard(
	Effect.gen(function* () {
		const discord = yield* Discord;

		yield* discord.client.on("interactionCreate", (interaction) =>
			Effect.gen(function* () {
				if (
					!interaction.isChatInputCommand() ||
					interaction.commandName !== "channel-settings"
				) {
					return;
				}
				yield* Effect.scoped(
					handleChannelSettingsCommand(interaction).pipe(
						Effect.provide(DatabaseLayer),
						Effect.catchAll((error) =>
							Console.error("Error in channel-settings command:", error),
						),
					),
				);
			}),
		);
	}),
);
