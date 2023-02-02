import { ApplyOptions } from "@sapphire/decorators";
import { Listener } from "@sapphire/framework";
import { Events, MessageReaction, User } from "discord.js";
import { markAsSolved, MarkSolutionError } from "~discord-bot/domains/mark-solution";

/*
  This file is a nice bit of legacy code being ported over from Answer Overflow V1 since Reactiflux needed to use ✅ as a reaction to mark a message as a solution.
  vcarl if you're seeing this hello - let's schedule a call soon to remove this
*/

const DISCORD_BOT_TESTING_SERVER_ID = "1037547185492996207";
const REACTIFLUX_ID = "102860784329052160";
export const ALLOWED_CHECKMARK_AS_REACTION_GUILD_IDS = new Set([
  DISCORD_BOT_TESTING_SERVER_ID,
  REACTIFLUX_ID,
]);

@ApplyOptions<Listener.Options>({ event: Events.MessageReactionAdd })
export class CheckmarkReactionMarkSolution extends Listener {
  public async run(message_reaction: MessageReaction, user: User) {
    if (message_reaction.emoji.name !== "✅" || message_reaction.me) return;
    try {
      const full_message = await message_reaction.message.fetch();
      if (!ALLOWED_CHECKMARK_AS_REACTION_GUILD_IDS.has(full_message.guildId ?? "")) return;
      const { embed, components, thread } = await markAsSolved(full_message, user);
      await thread.send({ embeds: [embed], components: components ? [components] : undefined });
    } catch (error) {
      if (error instanceof MarkSolutionError) {
        this.container.logger.info(`Checkmark MarkSolutionError: ${error.message}`);
      } else {
        throw error;
      }
    }
  }
}
