import type { MessageCommandSuccessPayload } from "@sapphire/framework";
import { Listener, LogLevel } from "@sapphire/framework";
import type { Logger } from "@sapphire/plugin-logger";
import { logSuccessCommand } from "~discord-bot/utils/utils";

export class UserEvent extends Listener {
	public run(payload: MessageCommandSuccessPayload) {
		logSuccessCommand(payload);
	}

	public override onLoad() {
		this.enabled = (this.container.logger as Logger).level <= LogLevel.Debug;
		return super.onLoad();
	}
}
