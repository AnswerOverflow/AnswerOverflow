"use client";

import { Button } from "@packages/ui/components/button";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Check, Copy, WrapText } from "lucide-react";
import { useState } from "react";
import type { BundledLanguage } from "shiki";
import { codeToHtml } from "shiki";

interface CodeBlockProps {
	lang?: string;
	content: string;
	key?: string;
}

function CodeBlockButtons({
	content,
	wrap,
	onToggleWrap,
}: {
	content: string;
	wrap: boolean;
	onToggleWrap: () => void;
}) {
	const [copied, setCopied] = useState(false);

	const handleCopy = async () => {
		await navigator.clipboard.writeText(content);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	return (
		<div className="absolute top-2 right-2 z-10 flex gap-1">
			<Button
				variant="ghost"
				size="icon-sm"
				onClick={onToggleWrap}
				className={`bg-background/80 backdrop-blur-sm hover:bg-background/90 ${wrap ? "text-primary" : ""}`}
				aria-label={wrap ? "Disable text wrap" : "Enable text wrap"}
			>
				<WrapText className="size-4" />
			</Button>
			<Button
				variant="ghost"
				size="icon-sm"
				onClick={handleCopy}
				className="bg-background/80 backdrop-blur-sm hover:bg-background/90"
				aria-label={copied ? "Copied" : "Copy code"}
			>
				{copied ? <Check className="size-4" /> : <Copy className="size-4" />}
			</Button>
		</div>
	);
}

function CodeBlockInternal({
	lang,
	content,
	theme,
	className,
	wrap,
}: {
	lang?: string;
	content: string;
	theme: "light" | "dark";
	className?: string;
	wrap: boolean;
}) {
	const { data: html } = useSuspenseQuery({
		queryKey: ["code-highlight", content, lang, theme],
		queryFn: async () => {
			try {
				const language = (lang?.toLowerCase() || "text") as BundledLanguage;

				return await codeToHtml(content, {
					lang: language,
					theme: theme === "dark" ? "github-dark" : "github-light",
				});
			} catch {
				return `<pre class="shiki"><code>${content.replace(
					/</g,
					"&lt;",
				)}</code></pre>`;
			}
		},
		staleTime: Infinity,
	});

	const wrapClasses = wrap
		? "[&_pre]:whitespace-pre-wrap [&_pre]:break-words"
		: "[&_pre]:w-fit [&_pre]:min-w-full";

	return (
		<div
			data-theme={theme}
			className={`[&_pre]:p-4 [&_pre]:pr-12 [&_pre]:m-0 ${wrapClasses} ${className || ""}`}
			// biome-ignore lint/security/noDangerouslySetInnerHtml: Required for Shiki syntax highlighting
			dangerouslySetInnerHTML={{ __html: html }}
		/>
	);
}

export function CodeBlock({ lang, content, key }: CodeBlockProps) {
	const [wrap, setWrap] = useState(false);

	return (
		<div key={key} className="relative w-full">
			<CodeBlockButtons
				content={content}
				wrap={wrap}
				onToggleWrap={() => setWrap(!wrap)}
			/>
			<div className="overflow-x-auto">
				<CodeBlockInternal
					lang={lang}
					content={content}
					theme="light"
					wrap={wrap}
					className={"dark:hidden block w-full"}
				/>
				<CodeBlockInternal
					lang={lang}
					content={content}
					theme="dark"
					wrap={wrap}
					className={"hidden dark:block w-full"}
				/>
			</div>
		</div>
	);
}
