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
import { toAOMessage } from "../utils/conversions";

// Allowed guild IDs for checkmark reaction mark solution (legacy feature)
const ALLOWED_CHECKMARK_AS_REACTION_GUILD_IDS = new Set([
	"1037547185492996207", // Discord Bot Testing Server
	"102860784329052160", // Reactiflux
]);

// Answer Overflow brand color
const ANSWER_OVERFLOW_BLUE_HEX = "#8CD1FF";

// Helper to create main site link
function makeMainSiteLink(path: string): string {
	const baseUrl =
		process.env.NEXT_PUBLIC_BASE_URL || "https://www.answeroverflow.com";
	return `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * Creates the embed and components for the mark solution response message
 */
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

	// Add "Learn more" field if no custom domain
	if (!serverPreferences?.customDomain) {
		embed.addFields({
			name: "Learn more",
			value: "https://answeroverflow.com",
		});
	}

	// Set description based on indexing and consent settings
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
		// TODO: Add consent button when manage account is implemented
	} else {
		embed.setDescription("**Thank you for marking this question as solved!**");
	}

	// Add "Jump To Solution" button
	components.addComponents(
		new ButtonBuilder()
			.setLabel("Jump To Solution")
			.setURL(solution.url)
			.setStyle(ButtonStyle.Link),
	);

	// Add "View on Answer Overflow" button if indexing is enabled
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

/**
 * Handles marking a message as a solution via checkmark reaction
 */
export function handleCheckmarkReactionMarkSolution(
	reaction: MessageReaction | PartialMessageReaction,
	user: User | PartialUser,
): Effect.Effect<void, unknown, Database> {
	return Effect.gen(function* () {
		const database = yield* Database;

		// Only handle checkmark emoji
		if (reaction.emoji.name !== "✅" || reaction.me) {
			return;
		}

		// Fetch full message if partial
		const fullMessage = yield* Effect.tryPromise({
			try: () => reaction.message.fetch(),
			catch: (error) => error,
		});

		if (!fullMessage.guildId) {
			return;
		}

		// Only allow in specific guilds (legacy feature)
		if (!ALLOWED_CHECKMARK_AS_REACTION_GUILD_IDS.has(fullMessage.guildId)) {
			return;
		}

		// Get server by Discord ID
		const serverLiveData = yield* Effect.scoped(
			database.servers.getServerByDiscordId(fullMessage.guildId),
		);
		yield* Effect.sleep("10 millis");
		const server = serverLiveData?.data;

		if (!server) {
			yield* Console.warn(
				`Server ${fullMessage.guildId} not found, skipping mark solution`,
			);
			return;
		}

		// Check if message is in a thread
		if (!fullMessage.channel.isThread()) {
			return;
		}

		const thread = fullMessage.channel;
		const parentChannel = thread.parent;

		if (!parentChannel) {
			return;
		}

		// Get channel settings
		const channelLiveData = yield* Effect.scoped(
			database.channels.getChannelByDiscordId(parentChannel.id),
		);
		yield* Effect.sleep("10 millis");
		const channelSettings = channelLiveData?.data;

		if (!channelSettings?.flags.markSolutionEnabled) {
			return;
		}

		// Find the question message (thread starter)
		// For forum channels, the thread ID is the question message ID
		// For text channels, fetch the message that started the thread
		let questionMessage: Message | null = null;

		if (parentChannel.type === 15) {
			// GuildForum
			try {
				const fetchedMessage = yield* Effect.tryPromise({
					try: () => thread.messages.fetch(thread.id),
					catch: () => null,
				});
				questionMessage = fetchedMessage ?? null;
			} catch {
				// Fallback: get first message in thread
				const messages = yield* Effect.tryPromise({
					try: () => thread.messages.fetch({ limit: 1 }),
					catch: () => null,
				});
				if (messages) {
					questionMessage = messages.first() ?? null;
				}
			}
		} else if (parentChannel.type === 0 || parentChannel.type === 5) {
			// Text channel or Announcement channel thread
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

		// Can't mark question as solution
		if (questionMessage.id === fullMessage.id) {
			return;
		}

		// Check if already solved
		// Check for solved tag (forum channels)
		if (
			parentChannel.type === 15 &&
			channelSettings.solutionTagId &&
			thread.appliedTags.includes(channelSettings.solutionTagId)
		) {
			return;
		}

		// Check for checkmark reaction on question
		const checkmarkReaction = questionMessage.reactions.cache.get("✅");
		if (checkmarkReaction?.users.cache.has(fullMessage.client.user?.id ?? "")) {
			return;
		}

		// Check permissions
		const guild = fullMessage.guild;
		if (!guild) {
			return;
		}

		// Fetch full user if partial
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

		// User must be question author or have ManageThreads permission
		const isQuestionAuthor = questionMessage.author.id === fullUser.id;
		const hasPermission =
			parentChannel.permissionsFor(guildMember)?.has("ManageThreads") ?? false;

		if (!isQuestionAuthor && !hasPermission) {
			return;
		}

		// Get server preferences
		const serverPreferencesLiveData = yield* Effect.scoped(
			database.serverPreferences.getServerPreferencesByServerId(server._id),
		);
		yield* Effect.sleep("10 millis");
		const serverPreferences = serverPreferencesLiveData?.data ?? null;

		// Mark as solved
		yield* Effect.promise(async () => {
			// Update solution message with questionId
			const solutionMessage = await toAOMessage(fullMessage, server._id);
			await upsertMessage(
				{
					...solutionMessage,
					questionId: questionMessage.id,
				},
				{ ignoreChecks: false },
			);

			// Add solved indicator
			if (
				parentChannel.type === 15 &&
				channelSettings.solutionTagId &&
				thread.appliedTags.length < 5
			) {
				// Forum channel: add solved tag
				await thread.setAppliedTags([
					...thread.appliedTags,
					channelSettings.solutionTagId,
				]);
			} else {
				// Text channel: add checkmark reaction
				await questionMessage.react("✅");
			}

			// React to solution message
			try {
				await fullMessage.react("✅");
			} catch {
				// Ignore if already reacted
			}

			// Send response message with embed and buttons
			const { embed, components } = makeMarkSolutionResponse({
				solution: fullMessage,
				server: {
					name: server.name,
					_id: server._id,
				},
				serverPreferences,
				channelSettings,
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
