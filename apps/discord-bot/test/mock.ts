import { SapphireClient } from "@sapphire/framework";
import { Channel } from "diagnostics_channel";
import {
  User,
  Message,
  GuildMember,
  Guild,
  TextChannel,
  GuildChannel,
  Client,
  ChatInputCommandInteraction,
  CommandInteraction,
  Interaction,
  ApplicationCommandType,
  InteractionType,
} from "discord.js";
import type { RawCommandInteractionData } from "discord.js/typings/rawDataTypes";
// References: https://dev.to/heymarkkop/how-to-implement-test-and-mock-discordjs-v13-slash-commands-with-typescript-22lc
// Needs extension, just getting the concepts in for testing
export default class MockDiscord {
  public client!: SapphireClient;
  public user!: User;
  public slash_command!: ChatInputCommandInteraction;
  public message!: Message;
  public guildMember!: GuildMember;
  public guild!: Guild;
  public textChannel!: TextChannel;
  public guildChannel!: GuildChannel;
  public channel!: Channel;

  constructor() {
    this.mockClient();
    this.mockUser();
    this.mockGuild();
    this.mockGuildMember();
    this.mockMessage("test");
    this.mockChannel();
    this.mockGuildChannel();
    this.mockTextChannel();
  }

  public mockInteracion(command: RawCommandInteractionData): ChatInputCommandInteraction {
    const interaction = Reflect.construct(ChatInputCommandInteraction, [
      this.client,
      {
        id: command.id,
        data: command,
        commandId: command.data.id,
        commandName: command.data.name,
        user: {
          id: this.user.id,
          username: this.user.username,
          discriminator: this.user.discriminator,
        },
      },
    ]) as ChatInputCommandInteraction;
    interaction.commandName = command.data.name; // Have to set this out of the function, unsure why
    interaction.isCommand = vitest.fn(() => true);
    return interaction;
  }

  private mockClient(): void {
    this.client = new SapphireClient({ intents: [] });
    Client.prototype.login = vitest.fn();
  }

  private mockUser(): void {
    this.user = Reflect.construct(User, [
      this.client,
      {
        id: "user-id",
        username: "USERNAME",
        discriminator: "user#0000",
        avatar: "user avatar url",
        bot: false,
      },
    ]) as User;
  }

  private mockGuild(): void {
    this.guild = Reflect.construct(Guild, [
      this.client,
      {
        unavailable: false,
        id: "guild-id",
        name: "mocked js guild",
        icon: "mocked guild icon url",
        splash: "mocked guild splash url",
        region: "eu-west",
        member_count: 42,
        large: false,
        features: [],
        application_id: "application-id",
        afkTimeout: 1000,
        afk_channel_id: "afk-channel-id",
        system_channel_id: "system-channel-id",
        embed_enabled: true,
        verification_level: 2,
        explicit_content_filter: 3,
        mfa_level: 8,
        joined_at: new Date("2018-01-01").getTime(),
        owner_id: "owner-id",
        channels: [],
        roles: [],
        presences: [],
        voice_states: [],
        emojis: [],
      },
    ]) as Guild;
  }

  private mockChannel(): void {
    this.channel = Reflect.construct(Channel, [
      this.client,
      {
        id: "channel-id",
      },
    ]) as Channel;
  }

  private mockGuildChannel(): void {
    this.guildChannel = Reflect.construct(GuildChannel, [
      this.guild,
      {
        ...this.channel,
        name: "guild-channel",
        position: 1,
        parent_id: "123456789",
        permission_overwrites: [],
      },
    ]) as GuildChannel;
  }

  private mockTextChannel(): void {
    this.textChannel = Reflect.construct(TextChannel, [
      this.guild,
      {
        ...this.guildChannel,
        topic: "topic",
        nsfw: false,
        last_message_id: "123456789",
        lastPinTimestamp: new Date("2019-01-01").getTime(),
        rate_limit_per_user: 0,
      },
    ]) as TextChannel;
  }

  private mockGuildMember(): void {
    this.guildMember = Reflect.construct(GuildMember, [
      this.client,
      {
        id: BigInt(1),
        deaf: false,
        mute: false,
        self_mute: false,
        self_deaf: false,
        session_id: "session-id",
        channel_id: "channel-id",
        nick: "nick",
        joined_at: new Date("2020-01-01").getTime(),
        user: this.user,
        roles: [],
      },
      this.guild,
    ]) as GuildMember;
  }

  private mockMessage(content: string): void {
    this.message = Reflect.construct(Message, [
      this.client,
      {
        id: BigInt(10),
        type: "DEFAULT",
        content: content,
        author: this.user,
        webhook_id: null,
        member: this.guildMember,
        pinned: false,
        tts: false,
        nonce: "nonce",
        embeds: [],
        attachments: [],
        edited_timestamp: null,
        reactions: [],
        mentions: [],
        mention_roles: [],
        mention_everyone: [],
        hit: false,
      },
      this.textChannel,
    ]) as Message;
    this.message.react = vitest.fn();
  }
}
