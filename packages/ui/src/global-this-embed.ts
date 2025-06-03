export type GlobalThisEmbed = {
	subpath?: string | null;
};
export function getGlobalThisValue(): GlobalThisEmbed | undefined {
	// @ts-expect-error - globalThis is not typed
	return globalThis.__SERVER_CONTENT;
}
