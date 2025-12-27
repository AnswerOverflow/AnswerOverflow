import {
	ApplicationCommandType,
	ContextMenuCommandBuilder,
	InteractionContextType,
	PermissionFlagsBits,
	SlashCommandBuilder,
} from "discord.js";
import { Effect } from "effect";
import { Discord } from "../core/discord-service";
import { REACORD_STRESS_TEST_SCENARIOS } from "./reacord-stress-test/index";

const globalCommands = [
	new ContextMenuCommandBuilder()
		.setName("✅ Mark Solution")
		.setType(ApplicationCommandType.Message)
		.setContexts(InteractionContextType.Guild),
	new ContextMenuCommandBuilder()
		.setName("Quick Action")
		.setType(ApplicationCommandType.Message)
		.setContexts(InteractionContextType.Guild),
	// new ContextMenuCommandBuilder()
	// 	.setName("Create GitHub Issue")
	// 	.setType(ApplicationCommandType.Message)
	// 	.setContexts(InteractionContextType.Guild),
	new SlashCommandBuilder()
		.setName("leaderboard")
		.setDescription("See who has solved the most questions in the server.")
		.setContexts(InteractionContextType.Guild)
		.addBooleanOption((option) =>
			option
				.setName("ephemeral")
				.setDescription("Show the leaderboard only to you."),
		),
	new SlashCommandBuilder()
		.setName("manage-account")
		.setDescription("Manage how Answer Overflow interacts with your account")
		.setContexts(InteractionContextType.Guild),
	new SlashCommandBuilder()
		.setName("channel-settings")
		.setDescription("Configure channel settings in the dashboard")
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
		.setContexts(InteractionContextType.Guild),
	new SlashCommandBuilder()
		.setName("feedback")
		.setDescription("Send feedback about Answer Overflow")
		.setContexts(InteractionContextType.Guild, InteractionContextType.BotDM),
	new SlashCommandBuilder()
		.setName("bug-report")
		.setDescription("Report a bug with Answer Overflow")
		.setContexts(InteractionContextType.Guild, InteractionContextType.BotDM),
] as const;

const guildCommands = [
	new SlashCommandBuilder()
		.setName("debug")
		.setDescription(
			"Debug command for testing latency and API status (Rhys only)",
		)
		.setContexts(InteractionContextType.Guild),
	new SlashCommandBuilder()
		.setName("reacord-stress-test")
		.setDescription("Stress test Reacord V2 components (Rhys only)")
		.setContexts(InteractionContextType.Guild)
		.addStringOption((option) =>
			option
				.setName("scenario")
				.setDescription("The stress test scenario to run")
				.setRequired(true)
				.addChoices(
					...REACORD_STRESS_TEST_SCENARIOS.map((s) => ({ name: s, value: s })),
				),
		),
] as const;

const registerCommandsEffect = Effect.fn("register_commands")(function* () {
	yield* Effect.annotateCurrentSpan({
		operation: "register_commands",
	});

	const discord = yield* Discord;

	// Register global commands
	yield* discord.use("register_global_commands", (client) =>
		client.application?.commands.set(globalCommands),
	);

	// Register guild-specific commands for debug server
	yield* discord.use("register_guild_commands", (client) => {
		const targetGuildId = "1037547185492996207";
		const guild = client.guilds.cache.get(targetGuildId);
		if (guild) {
			return guild.commands.set(guildCommands);
		}
		// Return undefined if guild not found - this maintains the proper return type
		return Promise.resolve(undefined);
	});
});

export function registerCommands() {
	return registerCommandsEffect().pipe(
		Effect.mapError((error) => new Error(String(error))),
	);
}
