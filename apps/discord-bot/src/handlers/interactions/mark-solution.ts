import { Database, upsertMessage } from "@packages/database/database";
import type {
	Message,
	MessageReaction,
	PartialMessageReaction,
	PartialUser,
	User,
} from "discord.js";
import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	EmbedBuilder,
	type MessageActionRowComponentBuilder,
} from "discord.js";
import { Console, Effect } from "effect";
import { toAOMessage } from "../../utils/conversions";

const ALLOWED_CHECKMARK_AS_REACTION_GUILD_IDS = new Set([
	"1037547185492996207", // Discord Bot Testing Server
	"102860784329052160", // Reactiflux
]);

const ANSWER_OVERFLOW_BLUE_HEX = "#8CD1FF";

function makeMainSiteLink(path: string): string {
	const baseUrl =
		process.env.NEXT_PUBLIC_BASE_URL || "https://www.answeroverflow.com";
	return `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

export function makeMarkSolutionResponse({
	solution,
	server,
	serverPreferences,
	channelSettings,
}: {
	solution: Message;
	server: { name: string; _id: string };
	serverPreferences: {
		customDomain?: string;
		considerAllMessagesPublicEnabled?: boolean;
	} | null;
	channelSettings: {
		flags: {
			indexingEnabled: boolean;
			forumGuidelinesConsentEnabled: boolean;
		};
	};
}) {
	const components = new ActionRowBuilder<MessageActionRowComponentBuilder>();
	const embed = new EmbedBuilder().setColor(
		ANSWER_OVERFLOW_BLUE_HEX as `#${string}`,
	);

	if (!serverPreferences?.customDomain) {
		embed.addFields({
			name: "Learn more",
			value: "https://answeroverflow.com",
		});
	}

	if (
		channelSettings.flags.indexingEnabled &&
		!channelSettings.flags.forumGuidelinesConsentEnabled &&
		!serverPreferences?.considerAllMessagesPublicEnabled
	) {
		embed.setDescription(
			[
				`**Thank you for marking this question as solved!**`,
				`Want to help others find the answer to this question? Use the button below to display your messages in ${server.name} on the web!`,
			].join("\n\n"),
		);
	} else {
		embed.setDescription("**Thank you for marking this question as solved!**");
	}

	components.addComponents(
		new ButtonBuilder()
			.setLabel("Jump To Solution")
			.setURL(solution.url)
			.setStyle(ButtonStyle.Link),
	);

	if (channelSettings.flags.indexingEnabled) {
		components.addComponents(
			new ButtonBuilder()
				.setLabel(
					serverPreferences?.customDomain
						? `View on ${server.name}`
						: "View on Answer Overflow",
				)
				.setURL(makeMainSiteLink(`/m/${solution.id}`))
				.setStyle(ButtonStyle.Link),
		);
	}

	return {
		embed,
		components: components.components.length > 0 ? components : undefined,
	};
}

function _handleCheckmarkReactionMarkSolution(
	reaction: MessageReaction | PartialMessageReaction,
	user: User | PartialUser,
): Effect.Effect<void, unknown, Database> {
	return Effect.gen(function* () {
		const database = yield* Database;

		if (reaction.emoji.name !== "✅" || reaction.me) {
			return;
		}

		const fullMessage = yield* Effect.tryPromise({
			try: () => reaction.message.fetch(),
			catch: (error) => error,
		});

		if (!fullMessage.guildId) {
			return;
		}

		if (!ALLOWED_CHECKMARK_AS_REACTION_GUILD_IDS.has(fullMessage.guildId)) {
			return;
		}

		const serverLiveData = yield* Effect.scoped(
			database.servers.getServerByDiscordId({ discordId: fullMessage.guildId }),
		);
		const server = serverLiveData;

		if (!server) {
			yield* Console.warn(
				`Server ${fullMessage.guildId} not found, skipping mark solution`,
			);
			return;
		}

		if (!fullMessage.channel.isThread()) {
			return;
		}

		const thread = fullMessage.channel;
		const parentChannel = thread.parent;

		if (!parentChannel) {
			return;
		}

		const channelLiveData = yield* Effect.scoped(
			database.channels.findChannelByDiscordId({ discordId: parentChannel.id }),
		);
		const channelSettings = channelLiveData;

		if (!channelSettings || !channelSettings.flags?.markSolutionEnabled) {
			return;
		}

		let questionMessage: Message | null = null;

		if (parentChannel.type === 15) {
			try {
				const fetchedMessage = yield* Effect.tryPromise({
					try: () => thread.messages.fetch(thread.id),
					catch: () => null,
				});
				questionMessage = fetchedMessage ?? null;
			} catch {
				const messages = yield* Effect.tryPromise({
					try: () => thread.messages.fetch({ limit: 1 }),
					catch: () => null,
				});
				if (messages) {
					questionMessage = messages.first() ?? null;
				}
			}
		} else if (parentChannel.type === 0 || parentChannel.type === 5) {
			try {
				const fetchedMessage = yield* Effect.tryPromise({
					try: () => {
						if ("messages" in parentChannel) {
							return parentChannel.messages.fetch(thread.id);
						}
						return Promise.resolve(null);
					},
					catch: () => null,
				});
				questionMessage = fetchedMessage ?? null;
			} catch {
				return;
			}
		}

		if (!questionMessage) {
			return;
		}

		if (questionMessage.id === fullMessage.id) {
			return;
		}

		if (
			parentChannel.type === 15 &&
			channelSettings?.solutionTagId &&
			thread.appliedTags.includes(channelSettings.solutionTagId)
		) {
			return;
		}

		const checkmarkReaction = questionMessage.reactions.cache.get("✅");
		if (checkmarkReaction?.users.cache.has(fullMessage.client.user?.id ?? "")) {
			return;
		}

		const guild = fullMessage.guild;
		if (!guild) {
			return;
		}

		const fullUser = yield* Effect.tryPromise({
			try: () => {
				if (user.partial) {
					return user.fetch();
				}
				return Promise.resolve(user as User);
			},
			catch: () => null,
		});

		if (!fullUser) {
			return;
		}

		const guildMember = yield* Effect.tryPromise({
			try: () => guild.members.fetch(fullUser.id),
			catch: () => null,
		});

		if (!guildMember) {
			return;
		}

		const isQuestionAuthor = questionMessage.author.id === fullUser.id;
		const hasPermission =
			parentChannel.permissionsFor(guildMember)?.has("ManageThreads") ?? false;

		if (!isQuestionAuthor && !hasPermission) {
			return;
		}

		const serverPreferencesLiveData = yield* Effect.scoped(
			database.server_preferences.getServerPreferencesByServerId({
				serverId: server._id,
			}),
		);
		const serverPreferences = serverPreferencesLiveData ?? null;

		yield* Effect.promise(async () => {
			const solutionMessage = await toAOMessage(fullMessage, server._id);
			await upsertMessage(
				{
					...solutionMessage,
					questionId: questionMessage.id,
				},
				{ ignoreChecks: false },
			);

			if (
				parentChannel.type === 15 &&
				channelSettings?.solutionTagId &&
				thread.appliedTags.length < 5
			) {
				await thread.setAppliedTags([
					...thread.appliedTags,
					channelSettings.solutionTagId,
				]);
			} else {
				await questionMessage.react("✅");
			}

			try {
				await fullMessage.react("✅");
			} catch {}

			if (!channelSettings || !channelSettings.flags) {
				return;
			}

			const { embed, components } = makeMarkSolutionResponse({
				solution: fullMessage,
				server: {
					name: server.name,
					_id: server._id,
				},
				serverPreferences,
				channelSettings: {
					...channelSettings,
					flags: channelSettings.flags,
				},
			});

			try {
				await thread.send({
					embeds: [embed],
					components: components ? [components] : undefined,
				});
			} catch (error) {
				console.error("Error sending mark solution response:", error);
			}
		}).pipe(
			Effect.tap(() =>
				Console.log(
					`Marked message ${fullMessage.id} as solution to question ${questionMessage.id}`,
				),
			),
			Effect.catchAll((error) =>
				Console.error("Error marking solution:", error),
			),
		);
	});
}
