import React from "react";
import remarkGfm from "remark-gfm";
import { Streamdown } from "streamdown";
import { BlueLink } from "../components/blue-link";
import { rehypeDiscordCommand } from "./plugins/rehype-discord-command";
import { rehypeDiscordEmoji } from "./plugins/rehype-discord-emoji";
import { rehypeDiscordSpoiler } from "./plugins/rehype-discord-spoiler";
import { remarkDiscordImage } from "./plugins/remark-discord-image";
import { CodeBlock } from "./render/code-block";

type Components = Record<
	string,
	React.ComponentType<{
		href?: string;
		title?: string;
		className?: string;
		src?: string;
		alt?: string;
		children?: React.ReactNode;
		[key: string]: unknown;
	}>
>;

interface DiscordMarkdownProps {
	content: string;
	className?: string;
}

/**
 * Renders Discord markdown with support for:
 * - Discord emojis (<:name:id> and <a:name:id>)
 * - Spoilers (||text||)
 * - Command mentions (</command:id>)
 * - Standard markdown (bold, italic, code blocks, etc.)
 */
export function DiscordMarkdown({ content, className }: DiscordMarkdownProps) {
	const components: Components = {
		a: ({
			href,
			title,
			children,
		}: {
			href?: string;
			title?: string;
			children?: React.ReactNode;
		}) => {
			const url = href ?? "";
			const contentText =
				typeof children === "string"
					? children
					: React.Children.toArray(children)
							.map((child) => (typeof child === "string" ? child : ""))
							.join("");

			const masked = url !== contentText;

			return (
				<BlueLink
					href={url}
					target="_blank"
					rel="noopener ugc nofollow"
					title={masked ? `${title || contentText}\n(${url})` : url}
				>
					{children}
				</BlueLink>
			);
		},
		code: ({
			className: codeClassName,
			children,
			...props
		}: {
			className?: string;
			children?: React.ReactNode;
			[key: string]: unknown;
		}) => {
			const match = /language-(\w+)/.exec(codeClassName ?? "");
			const language = match ? match[1] : undefined;
			const isInline = !codeClassName;

			if (isInline) {
				return (
					<code
						className="bg-neutral-100 dark:bg-neutral-700 px-1 rounded"
						{...props}
					>
						{children}
					</code>
				);
			}

			return (
				<CodeBlock
					lang={language?.toLowerCase()}
					content={String(children).replace(/\n$/, "")}
					className="my-3"
				/>
			);
		},
		blockquote: ({ children }: { children?: React.ReactNode }) => (
			<blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 italic my-3">
				{children}
			</blockquote>
		),
		p: ({ children }: { children?: React.ReactNode }) => {
			// Check if paragraph is empty (blank line)
			const childrenArray = React.Children.toArray(children);
			const isEmpty =
				childrenArray.length === 0 ||
				childrenArray.every((child) => {
					if (typeof child === "string") {
						return child.trim() === "";
					}
					// Check if it's a React element with no meaningful content
					if (React.isValidElement(child)) {
						const childProps = child.props as { children?: React.ReactNode };
						const childChildren = React.Children.toArray(childProps?.children);
						return (
							childChildren.length === 0 ||
							childChildren.every(
								(c) => typeof c === "string" && c.trim() === "",
							)
						);
					}
					return false;
				});

			if (isEmpty) {
				return <div className="h-6" />;
			}

			// Add spacing between paragraphs to match Discord's rendering
			return <div className="mb-2">{children}</div>;
		},
		img: ({ src, alt }: { src?: string; alt?: string }) => {
			// Discord doesn't support markdown images, render as plain text
			return <span className="inline">{alt || src || ""}</span>;
		},
		h1: ({ children }: { children?: React.ReactNode }) => (
			<span className="heading-1 block text-2xl font-bold my-3">
				{children}
			</span>
		),
		h2: ({ children }: { children?: React.ReactNode }) => (
			<span className="heading-2 block text-xl font-bold my-3">{children}</span>
		),
		h3: ({ children }: { children?: React.ReactNode }) => (
			<span className="heading-3 block text-lg font-bold my-3">{children}</span>
		),
		s: ({ children }: { children?: React.ReactNode }) => <s>{children}</s>,
	};

	return (
		<Streamdown
			className={className}
			remarkPlugins={[remarkGfm, remarkDiscordImage]}
			rehypePlugins={[
				rehypeDiscordEmoji,
				rehypeDiscordSpoiler,
				rehypeDiscordCommand,
			]}
			components={components}
			parseIncompleteMarkdown={true}
		>
			{content}
		</Streamdown>
	);
}
