import type { Client } from "discord.js";
import { setupBot } from "./client-mock";
import { mockMessage } from "./message-mock";
let client: Client;

beforeEach(async () => {
  client = await setupBot();
});
describe("Mocked Message", () => {
  it("should create a mocked message", () => {
    const message = mockMessage({ client });
    expect(message).toBeDefined();
    const channel = client.channels.cache.get(message.channelId);
    expect(channel?.isTextBased() && channel.messages.cache.get(message.id)).toBe(message);
  });
  it("should edit a mocked message", async () => {
    const message = mockMessage({ client });
    const content = "test";
    const edited = await message.edit(content);
    expect(message.content).toBe(content);
    const channel = client.channels.cache.get(message.channelId);
    expect(channel?.isTextBased() && channel.messages.cache.get(message.id)).toBe(edited);
  });
  it("should delete a mocked message", async () => {
    const message = mockMessage({ client });
    const deleted = await message.delete();
    const channel = client.channels.cache.get(message.channelId);
    expect(channel?.isTextBased() && channel.messages.cache.get(message.id)).toBeUndefined();
    expect(deleted).toBe(message);
  });
});
