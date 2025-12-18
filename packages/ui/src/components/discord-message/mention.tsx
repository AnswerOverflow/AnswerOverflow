import { ChannelType } from "discord-api-types/v10";
import { Hash, Lock, Megaphone, MessageSquare } from "lucide-react";
import type React from "react";
import { cn } from "../../lib/utils";
import { Link } from "../link";
import type { MessageWithMetadata } from "./types";

type MentionType = "channel" | "role" | "user" | "everyone" | "here";
type MentionProps = {
	type?: MentionType;
	message?: MessageWithMetadata;
	children: string;
};

const baseClassName =
	"p-0.5 not-prose space-x-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 align-baseline inline-flex items-center transition-colors cursor-pointer";

export function Mention({ type, message, children }: MentionProps) {
	if (type === "everyone") {
		return <EveryoneMention>{children}</EveryoneMention>;
	}

	if (type === "here") {
		return <HereMention>{children}</HereMention>;
	}

	if (!(type && message?.metadata)) {
		return <FallbackMention type={type}>{children}</FallbackMention>;
	}

	switch (type) {
		case "channel":
			return <ChannelMention message={message}>{children}</ChannelMention>;
		case "role":
			return <RoleMention message={message}>{children}</RoleMention>;
		case "user":
			return <UserMention message={message}>{children}</UserMention>;
		default:
			return <FallbackMention type={type}>{children}</FallbackMention>;
	}
}

function ChannelMention({
	message,
	children,
}: {
	message: MessageWithMetadata;
	children: string;
}) {
	const channelData = message.metadata?.channels?.[children];

	if (!channelData) {
		return <FallbackMention type="channel">{children}</FallbackMention>;
	}

	const isExternal = channelData.url.startsWith("http");
	const isUnknownChannel = channelData.exists === false;
	const isIndexingDisabled =
		channelData.exists === true && channelData.indexingEnabled === false;

	let content: React.ReactNode;
	if (isUnknownChannel) {
		content = (
			<>
				<Hash className="inline-block size-4" />
				<span>Unknown</span>
			</>
		);
	} else if (isIndexingDisabled) {
		content = (
			<>
				<Lock
					className="inline-block size-4 shrink-0"
					style={{ marginTop: "-0.0625rem" }}
				/>
				<span>No Access</span>
			</>
		);
	} else {
		content = (
			<>
				<ChannelIcon type={channelData.type} />
				<span>{channelData.name ?? children}</span>
			</>
		);
	}

	if (isExternal) {
		return (
			<a
				href={channelData.url}
				target="_blank"
				rel="noopener noreferrer"
				className={cn(baseClassName)}
			>
				{content}
			</a>
		);
	}

	return (
		<Link href={channelData.url} className={cn(baseClassName)}>
			{content}
		</Link>
	);
}

function RoleMention({
	message,
	children,
}: {
	message: MessageWithMetadata;
	children: string;
}) {
	const roleData = message.metadata?.roles?.[children];

	if (!roleData) {
		return <FallbackMention type="role">{children}</FallbackMention>;
	}

	return <span className={baseClassName}>@{roleData.name ?? children}</span>;
}

function UserMention({
	message,
	children,
}: {
	message: MessageWithMetadata;
	children: string;
}) {
	const userData = message.metadata?.users?.[children];

	if (!userData || userData.exists === false) {
		return (
			<span className={baseClassName}>
				@{userData?.username ?? "Unknown user"}
			</span>
		);
	}

	const content = `@${userData.username ?? children}`;

	if (userData.url.startsWith("http")) {
		return (
			<a
				href={userData.url}
				target="_blank"
				rel="noopener noreferrer"
				className={baseClassName}
			>
				{content}
			</a>
		);
	}

	return (
		<Link href={userData.url} className={baseClassName}>
			{content}
		</Link>
	);
}

function EveryoneMention({ children }: { children: string }) {
	return <span className={baseClassName}>@{children}</span>;
}

function HereMention({ children }: { children: string }) {
	return <span className={baseClassName}>@{children}</span>;
}

function FallbackMention({
	type,
	children,
}: {
	type?: MentionType;
	children: string;
}) {
	const prefix = type === "channel" ? "#" : "@";

	return (
		<span className={baseClassName}>
			{prefix}
			{children}
		</span>
	);
}

export function ChannelIcon({ type }: { type: number }) {
	switch (type) {
		case ChannelType.GuildForum:
			return <MessageSquare className="inline-block size-4" />;
		case ChannelType.PublicThread:
			return <ThreadIcon className="inline-block size-4" />;
		case ChannelType.GuildAnnouncement:
			return <Megaphone className="inline-block size-4" />;
		default:
			return <Hash className="inline-block size-4" />;
	}
}

export function ThreadIcon({ className }: { className?: string }) {
	return (
		<svg
			className={className}
			fill="none"
			height="24"
			viewBox="0 0 24 24"
			width="24"
			xmlns="http://www.w3.org/2000/svg"
		>
			<path
				d="M12 2.81a1 1 0 0 1 0-1.41l.36-.36a1 1 0 0 1 1.41 0l9.2 9.2a1 1 0 0 1 0 1.4l-.7.7a1 1 0 0 1-1.3.13l-9.54-6.72a1 1 0 0 1-.08-1.58l1-1L12 2.8Zm0 18.39a1 1 0 0 1 0 1.41l-.35.35a1 1 0 0 1-1.41 0l-9.2-9.19a1 1 0 0 1 0-1.41l.7-.7a1 1 0 0 1 1.3-.12l9.54 6.72a1 1 0 0 1 .07 1.58l-1 1zm3.66-4.4a1 1 0 0 1-1.38.28l-8.49-5.66A1 1 0 1 1 6.9 9.76l8.49 5.65a1 1 0 0 1 .27 1.39m1.44-2.55a1 1 0 1 0 1.11-1.66L9.73 6.93a1 1 0 0 0-1.11 1.66l8.49 5.66Z"
				fill="currentColor"
			/>
		</svg>
	);
}
