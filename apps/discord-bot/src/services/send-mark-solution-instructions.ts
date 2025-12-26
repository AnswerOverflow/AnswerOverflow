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
	makeSimilarThreadsButton,
} from "../utils/discord-components";
import { catchAllSilentWithReport } from "../utils/error-reporting";

export class SendMarkSolutionInstructionsError extends Error {
	constructor(
		public reason: string,
		message: string,
	) {
		super(message);
		this.name = "SendMarkSolutionInstructionsError";
	}
}

export type ChannelWithFlags = {
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

export function trackQuestionAsked(
	thread: ThreadChannel,
	channelSettings: ChannelWithFlags | null,
	threadOwner: GuildMember,
	question: Message | null,
) {
	return Effect.gen(function* () {
		if (!channelSettings?.flags) {
			return;
		}

		if (
			!channelSettings.flags.indexingEnabled &&
			!channelSettings.flags.markSolutionEnabled
		) {
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

		yield* catchAllSilentWithReport(
			trackAskedQuestion(
				thread,
				channelSettings,
				threadOwner,
				server,
				serverPreferences,
				question,
			),
		);
	}).pipe(
		Effect.withSpan("mark_solution.track_question_asked", {
			attributes: {
				"thread.id": thread.id,
				"thread.guild_id": thread.guildId,
				"thread_owner.id": threadOwner.id,
				has_question: question ? "true" : "false",
				indexing_enabled: channelSettings?.flags?.indexingEnabled
					? "true"
					: "false",
				mark_solution_enabled: channelSettings?.flags?.markSolutionEnabled
					? "true"
					: "false",
			},
		}),
	);
}

export function handleSendMarkSolutionInstructions(
	thread: ThreadChannel,
	newlyCreated: boolean,
	channelSettings: ChannelWithFlags | null,
	threadOwner: GuildMember,
	question: Message | null,
) {
	return Effect.gen(function* () {
		if (!channelSettings?.flags) {
			return;
		}

		if (!channelSettings.flags.sendMarkSolutionInstructionsInNewThreads) {
			return;
		}

		if (!newlyCreated) {
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

		if (channelSettings.flags.indexingEnabled) {
			components.addComponents(
				makeSimilarThreadsButton(thread.id, thread.guildId),
			);
		}

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

		yield* catchAllSilentWithReport(
			trackMarkSolutionInstructionsSent(
				thread,
				channelSettings,
				threadOwner,
				server,
				serverPreferences,
				question,
			),
		);

		console.log(
			`Sent mark solution instructions to thread ${thread.id} (owner: ${threadOwner.id})`,
		);
	}).pipe(
		Effect.withSpan("mark_solution.send_instructions", {
			attributes: {
				"thread.id": thread.id,
				"thread.guild_id": thread.guildId,
				"thread_owner.id": threadOwner.id,
				newly_created: newlyCreated ? "true" : "false",
				has_question: question ? "true" : "false",
				instructions_enabled: channelSettings?.flags
					?.sendMarkSolutionInstructionsInNewThreads
					? "true"
					: "false",
			},
		}),
	);
}
