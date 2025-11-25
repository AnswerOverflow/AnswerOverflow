import {
	ApplicationCommandType,
	Collection,
	ContextMenuCommandBuilder,
	PermissionFlagsBits,
	SlashCommandBuilder,
} from "discord.js";
import { Effect } from "effect";
import { Discord } from "../core/discord-service";

const commands = [
	new ContextMenuCommandBuilder()
		.setName("✅ Mark Solution")
		.setType(ApplicationCommandType.Message)
		.setDMPermission(false),
	new SlashCommandBuilder()
		.setName("leaderboard")
		.setDescription("See who has solved the most questions in the server.")
		.setDMPermission(false)
		.addBooleanOption((option) =>
			option
				.setName("ephemeral")
				.setDescription("Show the leaderboard only to you."),
		),
	new SlashCommandBuilder()
		.setName("manage-account")
		.setDescription("Manage how Answer Overflow interacts with your account")
		.setDMPermission(false),
	new SlashCommandBuilder()
		.setName("channel-settings")
		.setDescription("Configure channel settings in the dashboard")
		.setDMPermission(false)
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
	new SlashCommandBuilder()
		.setName("debug")
		.setDescription(
			"Debug command for testing latency and API status (Rhys only)",
		)
		.setDMPermission(false),
] as const;

export function registerCommands() {
	return Effect.gen(function* () {
		const discord = yield* Discord;

		// Register global commands (all except debug)
		const globalCommands = commands.filter((cmd) => cmd.name !== "debug");
		yield* discord.use((client) =>
			client.application?.commands.set(globalCommands),
		);

		// Register debug command only for specific server
		const debugCommand = commands.find((cmd) => cmd.name === "debug");
		if (debugCommand) {
			yield* discord.use((client) => {
				const targetGuildId = "1037547185492996207";
				const guild = client.guilds.cache.get(targetGuildId);
				if (guild) {
					return guild.commands.set([debugCommand]);
				}
				// Return undefined if guild not found - this maintains the proper return type
				return Promise.resolve(undefined);
			});
		}
	}).pipe(Effect.mapError((error) => new Error(String(error))));
}
