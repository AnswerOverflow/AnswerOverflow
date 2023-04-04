import {
	Message,
	User,
	MessageType,
	TextBasedChannel,
	Client,
	StartThreadOptions,
	MessagePayload,
	MessageEditOptions,
	Embed,
	APIEmbed,
	ActionRow,
	EmojiIdentifierResolvable,
	GuildEmoji,
	ReactionEmoji,
	APIMessageActionRowComponent,
	MessageActionRowComponent,
	ActionRowData,
	APIActionRowComponent,
	JSONEncodable,
	MessageActionRowComponentBuilder,
	MessageActionRowComponentData,
	InteractionReplyOptions,
	EmbedBuilder,
	MessageCreateOptions,
} from 'discord.js';
import type { RawMessageData } from 'discord.js/typings/rawDataTypes';
import { randomSnowflake } from '@answeroverflow/discordjs-utils';
import { mockGuildMember, mockUser } from './user-mock';
import {
	mockReaction,
	mockTextChannel,
	mockThreadFromParentMessage,
} from './channel-mock';

export function mockEmbed(
	data: JSONEncodable<APIEmbed> | APIEmbed | EmbedBuilder,
): Embed {
	return Reflect.construct(Embed, [
		data instanceof EmbedBuilder ? data.data : data,
	]) as Embed;
}

export function mockActionRow(
	data:
		| JSONEncodable<APIActionRowComponent<APIMessageActionRowComponent>>
		| ActionRowData<
				MessageActionRowComponentData | MessageActionRowComponentBuilder
		  >
		| APIActionRowComponent<APIMessageActionRowComponent>,
): ActionRow<MessageActionRowComponent> {
	return Reflect.construct(ActionRow, [
		data,
	]) as ActionRow<MessageActionRowComponent>;
}
export type MessageOpts =
	| string
	| MessageEditOptions
	| MessagePayload
	| InteractionReplyOptions
	| MessageCreateOptions;
export function applyMessagePayload(payload: MessageOpts, message: Message) {
	if (typeof payload === 'string') {
		message.content = payload;
	}
	if (payload instanceof MessagePayload) {
		throw new Error('Not implemented');
	}
	if (typeof payload !== 'string') {
		message.embeds = payload.embeds?.map(mockEmbed) ?? message.embeds;
		message.content = payload.content ?? message.content;
		message.components =
			payload.components?.map((comp) => mockActionRow(comp)) ??
			message.components;
	}

	return message;
}

export function mockMessage(input: {
	client: Client;
	author?: User;
	channel?: TextBasedChannel;
	override?: Partial<RawMessageData>;
	opts?: MessageOpts;
}) {
	const { client, opts, override = {} } = input;
	let { author, channel } = input;
	if (!channel) {
		channel = mockTextChannel(client);
	}
	if (!author) {
		author = mockUser(client);
		if (!channel.isDMBased()) {
			mockGuildMember({
				client,
				user: author,
				guild: channel.guild,
			});
		}
	}
	const rawData: RawMessageData = {
		id: randomSnowflake().toString(),
		channel_id: channel.id,
		author: {
			// TODO: Use a helper function to get properties
			id: author.id,
			username: author.username,
			discriminator: author.discriminator,
			avatar: author.avatar,
		},
		content: '',
		timestamp: '',
		edited_timestamp: null,
		tts: false,
		mention_everyone: false,
		mentions: [],
		mention_roles: [],
		attachments: [],
		embeds: [],
		pinned: false,
		type: MessageType.Default,
		reactions: [],
		...override,
	};
	const message = Reflect.construct(Message, [client, rawData]) as Message;
	// TODO: Fix ts ignore?
	// @ts-ignore
	channel.messages.cache.set(message.id, message);
	message.react = async (emoji: EmojiIdentifierResolvable) => {
		const isCustomEmoji = typeof emoji === 'string' && emoji.startsWith('<:');
		if (emoji instanceof GuildEmoji) {
			throw new Error('Not implement');
		}
		if (emoji instanceof ReactionEmoji) {
			throw new Error('Not implement');
		}
		return Promise.resolve(
			mockReaction({
				message,
				user: client.user!,
				override: {
					emoji: {
						id: isCustomEmoji ? emoji : null,
						name: isCustomEmoji ? null : emoji,
					},
				},
			}),
		);
	};
	message.startThread = async (options: StartThreadOptions) =>
		Promise.resolve(
			mockThreadFromParentMessage({
				client,
				parentMessage: message,
				data: options,
			}),
		);

	message.edit = (payload) => {
		return Promise.resolve(applyMessagePayload(payload, message));
	};

	message.delete = () => {
		channel?.messages.cache.delete(message.id);
		return Promise.resolve(message);
	};

	if (opts) applyMessagePayload(opts, message);
	return message;
}
