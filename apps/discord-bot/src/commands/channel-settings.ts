import { Database } from "@packages/database/database";
import type { ChatInputCommandInteraction } from "discord.js";
import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	EmbedBuilder,
	type MessageActionRowComponentBuilder,
	MessageFlags,
} from "discord.js";
import { Effect, Layer, Metric } from "effect";
import { Discord } from "../core/discord-service";
import { commandExecuted } from "../metrics";

function getDashboardUrl(serverId: string, channelId: string): string {
	const baseUrl =
		process.env.NEXT_PUBLIC_BASE_URL ?? "https://app.answeroverflow.com";
	return `${baseUrl}/dashboard/${serverId}/channels?channels=${channelId}`;
}

export const handleChannelSettingsCommand = Effect.fn(
	"channel_settings_command",
)(function* (interaction: ChatInputCommandInteraction) {
	yield* Effect.annotateCurrentSpan({
		"discord.guild_id": interaction.guildId ?? "unknown",
		"discord.channel_id": interaction.channelId ?? "unknown",
		"discord.user_id": interaction.user.id,
	});
	yield* Metric.increment(commandExecuted("channel_settings"));

	const database = yield* Database;
	const discord = yield* Discord;

	if (!interaction.guildId || !interaction.channelId || !interaction.channel) {
		yield* discord.callClient(() =>
			interaction.reply({
				content: "This command can only be used in a server channel",
				flags: MessageFlags.Ephemeral,
			}),
		);
		return;
	}

	const targetChannelId = interaction.channel?.isThread()
		? (interaction.channel.parentId ?? interaction.channelId)
		: interaction.channelId;

	if (!targetChannelId) {
		yield* discord.callClient(() =>
			interaction.reply({
				content: "Could not determine parent channel",
				flags: MessageFlags.Ephemeral,
			}),
		);
		return;
	}

	const serverLiveData = yield* database.private.servers.getServerByDiscordId({
		discordId: BigInt(interaction.guildId),
	});

	const server = serverLiveData;

	if (!server) {
		yield* discord.callClient(() =>
			interaction.reply({
				content: "Server not found in database",
				flags: MessageFlags.Ephemeral,
			}),
		);
		return;
	}

	const channelLiveData =
		yield* database.private.channels.findChannelByDiscordId({
			discordId: BigInt(targetChannelId),
		});

	if (!channelLiveData) {
		yield* discord.callClient(() =>
			interaction.reply({
				content: "Channel not found in database",
				flags: MessageFlags.Ephemeral,
			}),
		);
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

	yield* discord.callClient(() =>
		interaction.reply({
			embeds: [embed],
			components: [actionRow],
			flags: MessageFlags.Ephemeral,
		}),
	);
});

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
				yield* handleChannelSettingsCommand(interaction);
			}),
		);
	}),
);
