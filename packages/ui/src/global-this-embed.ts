import type { GlobalThisEmbed } from './global-this-embedder';

export function getGlobalThisValueServer(): GlobalThisEmbed | undefined {
	// @ts-expect-error - globalThis is not typed
	return globalThis.__SERVER_CONTENT;
}
