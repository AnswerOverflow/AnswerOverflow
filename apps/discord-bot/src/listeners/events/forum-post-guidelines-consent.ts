import { ApplyOptions } from "@sapphire/decorators";
import { Listener } from "@sapphire/framework";
import type { Message } from "discord.js";
import { provideConsentOnForumChannelMessage } from "~discord-bot/domains/consent";

@ApplyOptions<Listener.Options>({ event: "messageCreate" })
export class ForumPostGuideliensConsent extends Listener {
  public async run(message: Message) {
    await provideConsentOnForumChannelMessage(message);
  }
}
