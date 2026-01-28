import type {
	Embed,
	Message,
	MessageComponent,
	Sticker,
} from "@packages/database/convex/schema";
import type { DisplayAttachment } from "./attachments";

export type MessageMetadata = {
	webhookName?: string;
	webhookAvatar?: string;
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
	attachments?: DisplayAttachment[];
	embeds?: Embed[];
	stickers?: Sticker[];
	components?: MessageComponent[];
	snapshot?: MessageSnapshot | null;
	poll?: Poll | null;
	user?: {
		isIgnored?: boolean;
	} | null;
	isIgnored?: boolean;
};

export type MessageSnapshot = {
	content: string;
	type?: number;
	createdTimestamp: number;
	editedTimestamp?: number;
	flags?: number;
	attachments?: DisplayAttachment[];
	embeds?: Embed[];
	stickers?: Sticker[];
	components?: MessageComponent[];
	metadata?: MessageMetadata | null;
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
