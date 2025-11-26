"use client";

import dayjs from "dayjs";
import { parse } from "discord-markdown-parser";
import { CornerUpRight } from "lucide-react";
import type React from "react";
import { Attachments } from "./attachments";
import { Code } from "./code";
import { Embeds } from "./embed";
import { CustomEmoji, getEmojiSize, Twemoji } from "./emoji";
import { Link } from "./link";
import { Mention } from "./mention";
import { Poll } from "./poll";
import { Spoiler } from "./spoiler";
import type {
	MessageSnapshot,
	MessageWithMetadata,
	SingleASTNode,
} from "./types";

function renderASTNode(
	node: SingleASTNode | SingleASTNode[],
	index: number,
	parent: SingleASTNode | SingleASTNode[] | null,
	isReferenceReply = false,
	message?: MessageWithMetadata,
): React.ReactNode {
	if (Array.isArray(node)) {
		return node.map((child, i) =>
			renderASTNode(child, i, node, isReferenceReply, message),
		);
	}

	if (
		isReferenceReply &&
		["br", "inlineCode", "codeBlock"].includes(node.type)
	) {
		return " ";
	}

	const key = index;

	function renderNodes(content: SingleASTNode | SingleASTNode[]) {
		return renderASTNode(content, key + 1, node, isReferenceReply, message);
	}

	switch (node.type) {
		case "text":
			return <span key={index}>{node.content as string}</span>;

		case "br":
			return <br key={key} />;

		case "heading": {
			const Tag = `h${node.level as number}`;
			return (
				// @ts-expect-error - dynamic tag
				<Tag key={key}>
					{renderNodes(node.content as SingleASTNode | SingleASTNode[])}
				</Tag>
			);
		}

		case "guildNavigation":
			return <div>10000</div>;

		case "strikethrough":
			return (
				<s key={key}>
					{renderNodes(node.content as SingleASTNode | SingleASTNode[])}
				</s>
			);

		case "strong":
			return (
				<strong key={key}>
					{renderNodes(node.content as SingleASTNode | SingleASTNode[])}
				</strong>
			);

		case "em":
			return (
				<em key={key}>
					{renderNodes(node.content as SingleASTNode | SingleASTNode[])}
				</em>
			);

		case "underline":
			return (
				<u key={key}>
					{renderNodes(node.content as SingleASTNode | SingleASTNode[])}
				</u>
			);

		case "inlineCode":
			return <Code code={node.content as string} isInline key={key} />;

		case "link":
		case "url":
			if (!message) {
				return null;
			}
			return (
				<Link
					content={
						renderNodes(
							node.content as SingleASTNode | SingleASTNode[],
						) as string
					}
					key={key}
					message={message}
					target={node.target as string}
				/>
			);

		case "emoji": {
			return (
				<CustomEmoji
					animated={node.animated as boolean}
					className={getEmojiSize(parent as SingleASTNode[])}
					emojiId={node.id as string}
					key={key}
					name={node.name as string}
				/>
			);
		}

		case "twemoji":
			return (
				<Twemoji
					className={getEmojiSize(parent as SingleASTNode[])}
					key={key}
					name={node.name as string}
				/>
			);

		case "user":
		case "channel":
		case "role":
			if (!message) {
				return null;
			}
			return (
				<Mention
					key={key}
					message={message}
					type={node.type as "user" | "channel" | "role"}
				>
					{node.id as string}
				</Mention>
			);

		case "everyone":
			return (
				<Mention key={key} type="everyone">
					everyone
				</Mention>
			);

		case "here":
			return (
				<Mention key={key} type="here">
					here
				</Mention>
			);

		case "timestamp":
			return <Timestamp key={key}>{node.timestamp as string}</Timestamp>;

		case "codeBlock":
			return (
				<Code
					code={node.content as string}
					key={key}
					language={node.lang as string}
				/>
			);

		case "spoiler":
			return (
				<Spoiler key={key}>
					{renderNodes(node.content as SingleASTNode | SingleASTNode[])}
				</Spoiler>
			);

		case "blockQuote":
			return (
				<blockquote key={key}>
					{renderNodes(node.content as SingleASTNode | SingleASTNode[])}
				</blockquote>
			);

		case "list":
			return (
				<List
					items={node.items as SingleASTNode[][]}
					key={key}
					ordered={node.ordered as boolean}
				/>
			);
		default:
			return null;
	}
}

export const DiscordMarkdown = ({
	children,
	isReferenceReply = false,
	message,
}: {
	children: string | null;
	isReferenceReply?: boolean;
	message: MessageWithMetadata | MessageSnapshot;
}) => {
	if (!children) {
		return null;
	}
	const parsed = parse(children, "normal");
	return (
		<div>
			{renderASTNode(
				parsed,
				0,
				null,
				isReferenceReply,
				message as MessageWithMetadata,
			)}
		</div>
	);
};

export function DiscordUIMessage({
	message,
}: {
	message: MessageWithMetadata;
}) {
	if (message.user?.isIgnored || message.isIgnored) {
		return (
			<div>
				<p>
					User prefers to remain anonymous, join the server to see this message.
				</p>
			</div>
		);
	}
	const MessageContent = ({
		message: msg,
	}: {
		message: MessageWithMetadata | MessageSnapshot;
	}) => {
		if (!msg) {
			return null;
		}
		return (
			<>
				<DiscordMarkdown message={msg}>{msg.content}</DiscordMarkdown>
				<Attachments attachments={msg.attachments ?? []} />
				<Embeds embeds={msg.embeds ?? null} />
			</>
		);
	};

	if (!message.snapshot) {
		return (
			<>
				<MessageContent message={message} />
				<Poll poll={message.poll} />
			</>
		);
	}

	return (
		<div>
			<blockquote className="quote">
				<div className="space-x-1">
					<CornerUpRight className="inline-flex size-4" />
					<span className="text-neutral-700 text-sm">Forwarded</span>
				</div>
				<div className="[&_img]:my-0">
					<MessageContent message={message.snapshot} />
				</div>
			</blockquote>
		</div>
	);
}

function List({
	items,
	ordered,
}: {
	items: SingleASTNode[][];
	ordered?: boolean;
}) {
	const Tag = ordered ? "ol" : "ul";
	return (
		<Tag className="my-0!">
			{items.map((item, idx) => (
				<li className="marker:text-black" key={idx}>
					{item.map((i, childIdx) =>
						renderASTNode(i, childIdx + idx + 1, item, true),
					)}
				</li>
			))}
		</Tag>
	);
}

function Timestamp({ children }: { children: string }) {
	return (
		<span className="rounded bg-neutral-200">
			{dayjs.unix(Number(children)).format("MMMM D, YYYY")}
		</span>
	);
}
