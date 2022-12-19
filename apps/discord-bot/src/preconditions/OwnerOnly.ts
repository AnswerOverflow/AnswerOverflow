import { AllFlowsPrecondition } from "@sapphire/framework";
import type {
  CommandInteraction,
  ContextMenuCommandInteraction,
  Message,
  Snowflake,
} from "discord.js";
import { envParseArray } from "~discord-bot/utils/env-parser";

const OWNERS = envParseArray("OWNERS");

export class UserPrecondition extends AllFlowsPrecondition {
  #message = "This command can only be used by the owner.";

  public override chatInputRun(interaction: CommandInteraction) {
    return this.doOwnerCheck(interaction.user.id);
  }

  public override contextMenuRun(interaction: ContextMenuCommandInteraction) {
    return this.doOwnerCheck(interaction.user.id);
  }

  public override messageRun(message: Message) {
    return this.doOwnerCheck(message.author.id);
  }

  private doOwnerCheck(userId: Snowflake) {
    return OWNERS.includes(userId) ? this.ok() : this.error({ message: this.#message });
  }
}

declare module "@sapphire/framework" {
  // eslint-disable-next-line no-unused-vars
  interface Preconditions {
    OwnerOnly: never;
  }
}
