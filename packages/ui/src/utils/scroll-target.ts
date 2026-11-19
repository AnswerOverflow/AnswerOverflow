const MESSAGE_ELEMENT_PREFIX = "message-";
const SOLUTION_ELEMENT_PREFIX = "solution-";

const SNOWFLAKE_PATTERN = /^\d{1,25}$/;

/**
 * Element ids a message can be rendered under. A reply that is the accepted
 * solution renders as `solution-<id>`, every other reply as `message-<id>`.
 */
export function messageElementIds(messageId: string): Array<string> {
	return [
		`${MESSAGE_ELEMENT_PREFIX}${messageId}`,
		`${SOLUTION_ELEMENT_PREFIX}${messageId}`,
	];
}

/**
 * Reads the message id out of a `#message-<id>` / `#solution-<id>` hash.
 * Returns null for hashes that do not point at a message.
 */
export function messageIdFromHash(
	hash: string | null | undefined,
): string | null {
	if (!hash) {
		return null;
	}
	const withoutHash = hash.startsWith("#") ? hash.slice(1) : hash;
	const prefix = [MESSAGE_ELEMENT_PREFIX, SOLUTION_ELEMENT_PREFIX].find(
		(candidate) => withoutHash.startsWith(candidate),
	);
	if (!prefix) {
		return null;
	}
	const id = withoutHash.slice(prefix.length);
	return SNOWFLAKE_PATTERN.test(id) ? id : null;
}

export type ScrollResolution =
	/** The item is loaded and can be scrolled to. */
	| { type: "scroll"; index: number }
	/** The item has not been paged in yet. */
	| { type: "loadMore" }
	/** Every page is loaded and the item is not among them. */
	| { type: "unreachable" };

/**
 * Decides what a paginated list should do when asked to scroll to an item.
 * A list that only looks at what it has already loaded silently does nothing
 * for items further down, which is why targets have to page in first.
 */
export function resolveScrollTarget<Item>(args: {
	items: ReadonlyArray<Item>;
	getItemId: (item: Item) => string;
	targetId: string;
	isDone: boolean;
}): ScrollResolution {
	const index = args.items.findIndex(
		(item) => args.getItemId(item) === args.targetId,
	);
	if (index >= 0) {
		return { type: "scroll", index };
	}
	return args.isDone ? { type: "unreachable" } : { type: "loadMore" };
}
