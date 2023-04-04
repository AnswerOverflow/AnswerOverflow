import type { Message } from 'discord.js';
import { isSnowflakeLargerAsInt } from './snowflake';

export function sortMessagesById<T extends Message>(messages: T[]) {
	return messages.sort((a, b) => isSnowflakeLargerAsInt(a.id, b.id));
}
