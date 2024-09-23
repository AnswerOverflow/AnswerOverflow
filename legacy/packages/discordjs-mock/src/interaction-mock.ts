import {
	ChatInputCommandInteraction,
	InteractionType,
	type APIChatInputApplicationCommandInteraction,
	ApplicationCommandType,
	GuildMember,
	PermissionsBitField,
	Client,
	ButtonInteraction,
	ComponentType,
	InteractionResponse,
	type Interaction,
	type Snowflake,
	type InteractionUpdateOptions,
	MessagePayload,
	Message,
	User,
	type APIBaseInteraction,
	type Channel,
	StringSelectMenuInteraction,
	type APIMessageStringSelectInteractionData,
	type GuildTextBasedChannel,
	GuildMemberFlags,
	APIMessageButtonInteractionData,
	APIMessageComponentInteraction,
	CacheType,
} from 'discord.js';
import { randomSnowflake } from '@answeroverflow/discordjs-utils';
import { mockTextChannel } from './channel-mock';
import { mockMessage } from './message-mock';
import { mockGuildMember } from './user-mock';
import { messageToAPIData } from './to-api-data';

function setupMockedInteractionAPIData<Type extends InteractionType>({
	channel,
	caller,
	message = undefined,
	type,
	applicationId = undefined,
	override = {},
}: {
	applicationId?: string;
	channel: Channel;
	message?: Message;
	caller: User;
	type: Type;
	override?: Partial<APIBaseInteraction<Type, object>>;
}): Omit<
	Required<APIBaseInteraction<Type, object>>,
	'guild_id' | 'message' | 'member'
> &
	Pick<APIBaseInteraction<Type, object>, 'guild_id' | 'message' | 'member'> {
	const guild = channel.isDMBased() ? undefined : channel.guild;
	let appPermissions = null;
	let memberPermissions = null;
	if (guild) {
		appPermissions = guild.members.cache
			.get(channel.client.user.id)!
			.permissions.bitfield.toString();
		memberPermissions = guild.members.cache
			.get(caller.id)!
			.permissions.bitfield.toString();
	}
	return {
		application_id: applicationId ?? randomSnowflake().toString(),
		channel_id: channel.id,
		channel: {
			id: channel.id,
			type: channel.type,
		},
		id: randomSnowflake().toString(),
		token: randomSnowflake().toString(), // TODO: Use a real token
		version: 1,
		app_permissions: appPermissions ?? PermissionsBitField.Default.toString(),
		locale: 'en-US',
		guild_id: channel.isDMBased() ? undefined : channel.guild.id,
		user: {
			id: caller.id,
			avatar: caller.avatar,
			discriminator: caller.discriminator,
			username: caller.username,
			global_name: caller.username,
		},
		member: guild
			? {
					deaf: false,
					flags: GuildMemberFlags.CompletedOnboarding,
					joined_at: guild.members.cache
						.get(caller.id)!
						.joinedAt!.toISOString(),
					mute: false,
					permissions:
						memberPermissions ?? PermissionsBitField.Default.toString(),
					roles: guild.members.cache
						.get(caller.id)!
						.roles.cache.map((r) => r.id),
					user: {
						id: caller.id,
						avatar: caller.avatar,
						discriminator: caller.discriminator,
						username: caller.username,
						global_name: caller.username,
					},
					avatar: caller.avatar,
				}
			: undefined,
		data: {},
		guild_locale: 'en-US',
		message: message ? messageToAPIData(message) : undefined,
		type,
		entitlements: [],
		...override,
	};
}

function applyInteractionResponseHandlers(interaction: Interaction) {
	const client = interaction.client;
	if ('update' in interaction) {
		// @ts-ignore
		interaction.update = async (
			options:
				| (InteractionUpdateOptions & { fetchReply: true })
				| (string | MessagePayload | InteractionUpdateOptions),
		) => {
			interaction.deferred = false;
			interaction.replied = true;
			await interaction.message.edit(options);
			if (options instanceof Object && 'fetchReply' in options) {
				return Promise.resolve(interaction.message);
			}
			return mockInteractionResponse({
				interaction: interaction,
				id: interaction.id,
			});
		};
	}
	if ('deferUpdate' in interaction) {
		// @ts-ignore
		interaction.deferUpdate = (options) => {
			interaction.deferred = true;
			if (options?.fetchReply) {
				return Promise.resolve(interaction.message);
			}
			return Promise.resolve(
				mockInteractionResponse({
					id: interaction.id,
					interaction,
				}),
			);
		};
	}

	if ('deferReply' in interaction) {
		// @ts-ignore
		interaction.deferReply = (options) => {
			interaction.deferred = true;
			const msg = mockMessage({
				client,
				channel: interaction.channel ?? undefined, // TODO: probably error here?
				author: interaction.client.user,
				override: {
					id: interaction.id.toString(),
				},
			});
			if (options?.fetchReply) {
				return Promise.resolve(msg);
			}
			return Promise.resolve(
				mockInteractionResponse({
					id: interaction.id,
					interaction,
				}),
			);
		};
	}

	if ('reply' in interaction) {
		// @ts-ignore
		interaction.reply = (opts) => {
			const msg = mockMessage({
				client,
				channel: interaction.channel ?? undefined, // TODO: probably error here?
				author: interaction.client.user,
				override: {
					id: interaction.id.toString(),
				},
				opts,
			});
			interaction.deferred = false;
			interaction.replied = true;

			if (opts instanceof Object && 'fetchReply' in opts) {
				return Promise.resolve(msg);
			}

			return Promise.resolve(
				mockInteractionResponse({
					interaction: interaction,
					id: interaction.id,
				}),
			);
		};
	}

	if ('fetchReply' in interaction) {
		interaction.fetchReply = () => {
			if (
				interaction.isChatInputCommand() ||
				interaction.isContextMenuCommand()
			) {
				const msg = interaction.channel?.messages.cache.get(interaction.id);
				if (!msg) throw new Error('Message not found');
				return Promise.resolve(msg);
			} else {
				if (!interaction.message) throw new Error('No message to edit');
				return Promise.resolve(interaction.message);
			}
		};
	}

	if ('editReply' in interaction) {
		interaction.editReply = async (opts) => {
			interaction.deferred = false;
			interaction.replied = true;
			if (
				interaction.isChatInputCommand() ||
				interaction.isContextMenuCommand()
			) {
				const message = await interaction.fetchReply();
				return message.edit(opts);
			} else {
				if (!interaction.message) throw new Error('No message to edit');
				return interaction.message?.edit(opts);
			}
		};
	}
}

export function mockChatInputCommandInteraction({
	client,
	name,
	id,
	channel,
	member,
}: {
	client: Client;
	name: string;
	id: string;
	channel?: GuildTextBasedChannel;
	member?: GuildMember;
}): ChatInputCommandInteraction {
	if (!channel) {
		channel = mockTextChannel(client);
	}
	if (!member) {
		member = mockGuildMember({ client, guild: channel.guild });
	}
	const rawData: APIChatInputApplicationCommandInteraction = {
		...setupMockedInteractionAPIData({
			caller: member.user,
			channel,
			type: InteractionType.ApplicationCommand,
			applicationId: id,
		}),
		data: {
			id,
			name,
			type: ApplicationCommandType.ChatInput,
			guild_id: channel.guild.id,
		},
	};
	// TODO: Look into adding command to client cache
	const command = Reflect.construct(ChatInputCommandInteraction, [
		client,
		rawData,
	]) as ChatInputCommandInteraction;
	applyInteractionResponseHandlers(command);
	return command;
}

export function mockInteractionResponse({
	interaction,
	id,
}: {
	interaction: Interaction;
	id: Snowflake;
}): InteractionResponse {
	return Reflect.construct(InteractionResponse, [
		interaction,
		id,
	]) as InteractionResponse;
}

export function mockButtonInteraction({
	override = {},
	caller,
	message,
}: {
	caller: User;
	message: Message;
	override?: Partial<
		Omit<
			APIMessageButtonInteractionData & APIMessageComponentInteraction,
			'component_type'
		>
	>;
}) {
	const client = message.client;
	const customId = override.custom_id ?? randomSnowflake().toString();
	const rawData = {
		component_type: ComponentType.Button,
		custom_id: customId,
		message: messageToAPIData(message),
		...override,
		...setupMockedInteractionAPIData({
			caller,
			channel: message.channel,
			type: InteractionType.MessageComponent,
			message,
			override,
		}),
		data: {
			component_type: ComponentType.Button,
			custom_id: customId,
		},
	} satisfies APIMessageButtonInteractionData & APIMessageComponentInteraction;
	const interaction = Reflect.construct(ButtonInteraction, [
		client,
		rawData,
	]) as ButtonInteraction;
	applyInteractionResponseHandlers(interaction);
	return interaction;
}

export function mockStringSelectInteraction({
	override = {},
	caller,
	message,
	data,
}: {
	caller: User;
	message: Message;
	data: Omit<
		APIMessageStringSelectInteractionData,
		'component_type' | 'values'
	> & {
		values: string[] | string;
	};
	override?: Partial<Omit<APIMessageComponentInteraction, 'data'>>;
}): StringSelectMenuInteraction<CacheType> {
	const client = message.client;
	const rawData = {
		message: messageToAPIData(message),
		...override,
		...setupMockedInteractionAPIData({
			caller,
			channel: message.channel,
			type: InteractionType.MessageComponent,
			message,
			override,
		}),
		data: {
			component_type: ComponentType.StringSelect,
			custom_id: data.custom_id,
			values: Array.isArray(data.values) ? data.values : [data.values],
		},
	} satisfies APIMessageComponentInteraction & {
		data: APIMessageStringSelectInteractionData;
	};
	const interaction = Reflect.construct(StringSelectMenuInteraction, [
		client,
		rawData,
	]) as StringSelectMenuInteraction;
	applyInteractionResponseHandlers(interaction);
	return interaction;
}
