import { cn } from "../../lib/utils";
import type { SingleASTNode } from "./types";
import { emojiToTwemoji } from "./utils";

function customEmojiUrl(id: string, animated = false) {
	const extension = animated ? "webp" : "png";
	const animatedParam = animated ? "&animated=true" : "";
	return `https://cdn.discordapp.com/emojis/${id}.${extension}?size=128${animatedParam}`;
}

export function getEmojiSize(parent: SingleASTNode[]): string {
	const emojiWithText = parent?.every(
		(n) =>
			["twemoji", "emoji"].includes(n.type) ||
			(n.type === "text" && n.content === " "),
	);

	return emojiWithText ? "size-12" : "size-[1.375rem]";
}

type Props = {
	name: string;
	className?: string;
	emojiId?: string;
	animated?: boolean;
};

export function CustomEmoji({
	emojiId,
	animated,
	name,
	className = "size-12",
}: Props) {
	if (!emojiId) {
		return null;
	}
	return (
		<EmojiBase
			className={className}
			name={name}
			src={customEmojiUrl(emojiId, animated)}
		/>
	);
}

export function Twemoji({ name, className = "size-12" }: Props) {
	return (
		<EmojiBase className={className} name={name} src={emojiToTwemoji(name)} />
	);
}

export function EmojiBase({ name, src, className }: Props & { src: string }) {
	return (
		<img
			alt={name}
			aria-label={name}
			className={cn("not-prose inline-block", className)}
			draggable="false"
			loading="lazy"
			src={src}
			title={name}
		/>
	);
}
