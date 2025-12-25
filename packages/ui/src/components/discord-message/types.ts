import type {
	Attachment,
	Embed,
	Message,
	Sticker,
} from "@packages/database/convex/schema";

export type MessageMetadata = {
	channels?: Record<
		string,
		{
			name: string;
			type: number;
			url: string;
			indexingEnabled?: boolean;
			exists?: boolean;
		}
	>;
	roles?: Record<string, { name: string; color: number }>;
	users?: Record<
		string,
		{
			username: string;
			globalName: string | null;
			url: string;
			exists?: boolean;
		}
	>;
	internalLinks?: Array<{
		original: string;
		guild: { id: bigint; name: string };
		channel: {
			parent?: { name?: string; type?: number; parentId?: bigint };
			id: bigint;
			type: number;
			name: string;
			indexingEnabled?: boolean;
		};
		message?: bigint;
	}>;
};

export type MessageWithMetadata = Message & {
	metadata?: MessageMetadata | null;
	attachments?: Attachment[];
	embeds?: Embed[];
	stickers?: Sticker[];
	snapshot?: MessageSnapshot | null;
	poll?: Poll | null;
	user?: {
		isIgnored?: boolean;
	} | null;
	isIgnored?: boolean;
};

export type MessageSnapshot = {
	id: string | null;
	content: string;
	type: number;
	createdTimestamp: number;
	editedTimestamp: number | null;
	attachments: Attachment[];
	embeds: Embed[];
	stickers?: Sticker[];
	flags: number;
	forwardedInMessageId: string;
	metadata: MessageMetadata | null;
};

export type Poll = {
	question: string;
	resultsFinalized: boolean;
	layoutType: string;
	answers: Record<
		string,
		{
			text: string;
			voteCount: number;
			emoji: {
				id: string | null;
				name: string;
				animated: boolean;
			} | null;
		}
	>;
};

export type SingleASTNode = {
	type: string;
	[key: string]: unknown;
};
