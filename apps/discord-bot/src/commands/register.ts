import {
	ApplicationCommandType,
	ContextMenuCommandBuilder,
	REST,
	Routes,
	SlashCommandBuilder,
} from "discord.js";
import { Config, Console, Effect } from "effect";

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
] as const;

export function registerCommands(): Effect.Effect<void, Error> {
	return Effect.gen(function* () {
		const token = yield* Config.string("DISCORD_BOT_TOKEN");
		const clientId = yield* Config.string("DISCORD_CLIENT_ID");

		const rest = new REST().setToken(token);

		const commandData = commands.map((command) => command.toJSON());
		const result = (yield* Effect.tryPromise({
			try: () =>
				rest.put(Routes.applicationCommands(clientId), {
					body: commandData,
				}),
			catch: (error) =>
				error instanceof Error ? error : new Error(String(error)),
		})) as unknown[];

		yield* Console.log(
			`Successfully registered ${result.length} application (/) commands.`,
		);
	}).pipe(Effect.mapError((error) => new Error(String(error))));
}
