import { Client, Events, GuildMember, Message } from "discord.js";
import { delay, emitEvent } from "./helpers";
import { mockButtonInteraction, mockChatInputCommandInteraction } from "./interaction-mock";
import { setupBot } from "./client-mock";
import { mockMessage } from "./message-mock";
import { mockGuildMember } from "./user-mock";
import { mockTextChannel } from "./channel-mock";
let client: Client;
beforeEach(async () => {
  client = await setupBot();
});

describe("Interaction Mock", () => {
  describe("Chat input command interaction", () => {
    it("should reply", async () => {
      const interaction = mockChatInputCommandInteraction(client, "test", "test");
      const response = await interaction.reply({
        content: "hello",
        fetchReply: true,
      });
      expect(response.content).toBe("hello");
    });
    it("should defer", async () => {
      const interaction = mockChatInputCommandInteraction(client, "test", "test");
      await interaction.reply({
        content: "hello",
        fetchReply: true,
      });
      const defer = await interaction.deferReply({
        fetchReply: true,
      });
      expect(defer.id).toBe(interaction.id.toString());
    });
    it("should edit deferred reply", async () => {
      const interaction = mockChatInputCommandInteraction(client, "test", "test");
      await interaction.reply({
        content: "hello",
        fetchReply: true,
      });
      await interaction.deferReply({
        fetchReply: true,
      });
      const updated = await interaction.editReply("world");
      expect(updated.content).toBe("world");
    });
    it("should edit reply", async () => {
      const interaction = mockChatInputCommandInteraction(client, "test", "test");
      await interaction.reply({
        content: "hello",
        fetchReply: true,
      });
      const updated = await interaction.editReply("world");
      expect(updated.content).toBe("world");
    });
    it("should fetch the reply", async () => {
      const interaction = mockChatInputCommandInteraction(client, "test", "test");
      await interaction.reply({
        content: "hello",
        fetchReply: true,
      });
      const reply = await interaction.fetchReply();
      expect(reply.content).toBe("hello");
    });
  });
  describe("Button Interaction", () => {
    let message: Message;
    let caller: GuildMember;
    beforeEach(() => {
      caller = mockGuildMember({
        client,
      });
      const channel = mockTextChannel(client, caller.guild);
      message = mockMessage({
        client,
        author: caller.user,
        channel,
      });
    });
    it("should create a mocked button interaction", async () => {
      const client = await setupBot();
      const expectedId = "test";
      const interaction = mockButtonInteraction({
        caller: caller.user,
        message,
        override: {
          custom_id: expectedId,
        },
      });
      client.on(Events.InteractionCreate, async (interaction) => {
        if (interaction.isButton()) {
          await interaction.update({
            content: "test",
          });
        }
      });
      await emitEvent(client, Events.InteractionCreate, interaction);
      await delay();
      expect(interaction.message.content).toBe("test");
    });
    it("should deffer the button interaction", async () => {
      const expectedId = "test";
      const interaction = mockButtonInteraction({
        caller: caller.user,
        message,
        override: {
          custom_id: expectedId,
        },
      });
      await interaction.deferUpdate();
      expect(interaction.deferred).toBe(true);
    });
    it("should edit a button interaction reply", async () => {
      const interaction = mockButtonInteraction({
        caller: caller.user,
        message,
      });
      await interaction.reply("hello");
      await interaction.editReply("world");
      expect(interaction.message.content).toBe("world");
    });
    it("should reply to a button interaction", async () => {
      const interaction = mockButtonInteraction({
        caller: caller.user,
        message,
      });
      const reply = await interaction.reply({
        fetchReply: true,
        content: "hello",
      });

      expect(reply.content).toBe("hello");
    });
    it("should clear defer of a button interaction on reply", async () => {
      const interaction = mockButtonInteraction({
        caller: caller.user,
        message,
      });
      await interaction.deferUpdate();
      await interaction.reply("hello");
      expect(interaction.deferred).toBe(false);
    });
    it("should set replied on reply to an interaction", async () => {
      const interaction = mockButtonInteraction({
        caller: caller.user,
        message,
      });
      await interaction.reply("hello");
      expect(interaction.replied).toBe(true);
    });
  });
});
