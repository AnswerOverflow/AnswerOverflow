import { Database } from "@packages/database/database";
import type { ChatInputCommandInteraction } from "discord.js";
import { EmbedBuilder, MessageFlags } from "discord.js";
import { Effect, Layer } from "effect";
import { SUPER_USER_ID } from "../constants/super-user";
import { Discord } from "../core/discord-service";

export function handleDebugCommand(interaction: ChatInputCommandInteraction) {
	return Effect.gen(function* () {
		const database = yield* Database;
		const discord = yield* Discord;

		if (interaction.user.id !== SUPER_USER_ID) {
			yield* discord.callClient(() =>
				interaction.reply({
					content: "This command is only available to Rhys.",
					flags: MessageFlags.Ephemeral,
				}),
			);
			return;
		}

		// Defer the reply to allow time for API calls
		yield* discord.callClient(() =>
			interaction.deferReply({ flags: MessageFlags.Ephemeral }),
		);

		const startTime = Date.now();

		// Test database query
		const testQueryStart = Date.now();
		const serverCount = yield* database.private.servers.getAllServers({});
		const dbLatency = Date.now() - testQueryStart;

		// Test Discord API latency
		const discordApiStart = Date.now();
		yield* discord.getGuilds();
		const discordApiLatency = Date.now() - discordApiStart;

		// Calculate total command processing time
		const totalLatency = Date.now() - startTime;

		// Get bot stats
		const botStats = yield* discord.callClient(() => {
			const client = interaction.client;
			return {
				wsPing: client.ws.ping,
				uptime: client.uptime,
				guildCount: client.guilds.cache.size,
				userCount: client.users.cache.size,
			};
		});

		// Create debug embed
		const embed = new EmbedBuilder()
			.setTitle("🔍 Debug Information")
			.setColor("#00FF00")
			.setTimestamp()
			.addFields(
				{
					name: "⏱️ Latency Metrics",
					value: [
						`Command Processing: \`${totalLatency}ms\``,
						`Database Query: \`${dbLatency}ms\``,
						`Discord API: \`${discordApiLatency}ms\``,
						`WebSocket Ping: \`${botStats.wsPing}ms\``,
					].join("\n"),
					inline: false,
				},
				{
					name: "📊 Bot Statistics",
					value: [
						`Guilds: \`${botStats.guildCount}\``,
						`Cached Users: \`${botStats.userCount}\``,
						`Uptime: \`${Math.floor((botStats.uptime ?? 0) / 1000 / 60)} minutes\``,
						`Servers in DB: \`${serverCount.length}\``,
					].join("\n"),
					inline: false,
				},
				{
					name: "🌐 Environment",
					value: [
						`Node.js: \`${process.version}\``,
						`Platform: \`${process.platform}\``,
						`Memory Usage: \`${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB\``,
					].join("\n"),
					inline: false,
				},
			);

		yield* discord.callClient(() =>
			interaction.editReply({
				embeds: [embed],
			}),
		);
	}).pipe(
		Effect.catchAll((error) =>
			Effect.gen(function* () {
				const discord = yield* Discord;
				console.error("Debug command error:", error);

				const errorEmbed = new EmbedBuilder()
					.setTitle("❌ Debug Error")
					.setColor("#FF0000")
					.setDescription(
						`An error occurred while gathering debug information:\n\`\`\`\n${error instanceof Error ? error.message : String(error)}\n\`\`\``,
					)
					.setTimestamp();

				yield* discord.callClient(() =>
					interaction.editReply({
						embeds: [errorEmbed],
					}),
				);
			}),
		),
	);
}

export const DebugCommandHandlerLayer = Layer.scopedDiscard(
	Effect.gen(function* () {
		const discord = yield* Discord;

		yield* discord.client.on("interactionCreate", (interaction) =>
			Effect.gen(function* () {
				if (
					!interaction.isChatInputCommand() ||
					interaction.commandName !== "debug"
				) {
					return;
				}
				yield* handleDebugCommand(interaction);
			}),
		);
	}),
);
