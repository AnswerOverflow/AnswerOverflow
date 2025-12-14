import { Database } from "@packages/database/database";
import type { GuildMember, Message, ThreadChannel } from "discord.js";
import {
	ActionRowBuilder,
	EmbedBuilder,
	type MessageActionRowComponentBuilder,
} from "discord.js";
import { Effect } from "effect";
import {
	trackAskedQuestion,
	trackMarkSolutionInstructionsSent,
} from "../utils/analytics";
import {
	ANSWER_OVERFLOW_BLUE_HEX,
	makeDismissButton,
} from "../utils/discord-components";

export class SendMarkSolutionInstructionsError extends Error {
	constructor(
		public reason: string,
		message: string,
	) {
		super(message);
		this.name = "SendMarkSolutionInstructionsError";
	}
}

type ChannelWithFlags = {
	id: bigint;
	name: string;
	type: number;
	serverId: bigint;
	flags: {
		indexingEnabled: boolean;
		markSolutionEnabled: boolean;
		sendMarkSolutionInstructionsInNewThreads: boolean;
		autoThreadEnabled: boolean;
		forumGuidelinesConsentEnabled: boolean;
		solutionTagId?: bigint;
		inviteCode?: string;
	} | null;
};

export function handleSendMarkSolutionInstructions(
	thread: ThreadChannel,
	newlyCreated: boolean,
	channelSettings: ChannelWithFlags | null,
	threadOwner: GuildMember,
	question: Message | null,
) {
	return Effect.gen(function* () {
		if (!channelSettings) {
			return;
		}

		const database = yield* Database;

		const serverData = yield* database.private.servers.getServerByDiscordId({
			discordId: BigInt(thread.guildId),
		});

		if (!serverData) {
			return;
		}

		const preferencesData =
			yield* database.private.server_preferences.getServerPreferencesByServerId(
				{
					serverId: BigInt(thread.guildId),
				},
			);

		const server = {
			discordId: serverData.discordId.toString(),
			name: serverData.name,
		};

		const serverPreferences = preferencesData
			? {
					readTheRulesConsentEnabled:
						preferencesData.readTheRulesConsentEnabled,
				}
			: undefined;

		if (!channelSettings.flags) {
			return;
		}

		if (
			channelSettings.flags.indexingEnabled ||
			channelSettings.flags.markSolutionEnabled
		) {
			yield* trackAskedQuestion(
				thread,
				channelSettings,
				threadOwner,
				server,
				serverPreferences,
				question,
			).pipe(Effect.catchAll(() => Effect.void));
		}

		if (!channelSettings.flags.sendMarkSolutionInstructionsInNewThreads) {
			return;
		}

		if (!newlyCreated) {
			return;
		}

		const embed = new EmbedBuilder()
			.setDescription(
				`To help others find answers, you can mark your question as solved via \`Right click solution message -> Apps -> ✅ Mark Solution\``,
			)
			.setImage(
				"https://cdn.discordapp.com/attachments/1037547185492996210/1098915406627999764/mark_solution_instructions.png",
			)
			.setColor(ANSWER_OVERFLOW_BLUE_HEX as `#${string}`);

		const components =
			new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
				makeDismissButton(threadOwner.id),
			);

		yield* Effect.tryPromise({
			try: () =>
				thread.send({
					embeds: [embed],
					components: [components],
				}),
			catch: (error) => {
				console.error("Error sending mark solution instructions:", error);
				return new SendMarkSolutionInstructionsError(
					"send_failed",
					"Failed to send mark solution instructions",
				);
			},
		});

		yield* trackMarkSolutionInstructionsSent(
			thread,
			channelSettings,
			threadOwner,
			server,
			serverPreferences,
			question,
		).pipe(Effect.catchAll(() => Effect.void));

		console.log(
			`Sent mark solution instructions to thread ${thread.id} (owner: ${threadOwner.id})`,
		);
	});
}
