import {
	ApplicationCommandType,
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
] as const;

export function registerCommands() {
	return Effect.gen(function* () {
		const discord = yield* Discord;
		yield* discord.use((client) => client.application?.commands.set(commands));
	}).pipe(Effect.mapError((error) => new Error(String(error))));
}
