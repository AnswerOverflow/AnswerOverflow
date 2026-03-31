"use client";

import { Button } from "@packages/ui/components/button";
import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { highlightWithShiki } from "../lib/shiki";
import { cn } from "../lib/utils";

function CodeBlockButtons({
	content,
	onCopy,
}: {
	content: string;
	onCopy?: () => void;
}) {
	const [copied, setCopied] = useState(false);

	const handleCopy = async () => {
		await navigator.clipboard.writeText(content);
		setCopied(true);
		onCopy?.();
		setTimeout(() => setCopied(false), 2000);
	};

	return (
		<div className="absolute top-2 right-2 z-10 flex gap-1">
			<Button
				variant="ghost"
				size="icon-sm"
				onClick={handleCopy}
				className="bg-transparent hover:bg-background/50"
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
	className,
}: {
	lang?: string;
	content: string;
	className?: string;
}) {
	const lightHtml = highlightWithShiki({
		code: content,
		language: lang,
		theme: "github-light",
	});
	const darkHtml = highlightWithShiki({
		code: content,
		language: lang,
		theme: "github-dark",
	});

	return (
		<>
			<div
				className={cn(
					"dark:hidden [&_pre]:m-0 [&_pre]:min-w-full [&_pre]:w-fit [&_pre]:overflow-x-auto [&_pre]:p-4 [&_pre]:pr-12 [&_pre]:text-sm",
					className,
				)}
				dangerouslySetInnerHTML={{ __html: lightHtml }}
			/>
			<div
				className={cn(
					"hidden dark:block [&_pre]:m-0 [&_pre]:min-w-full [&_pre]:w-fit [&_pre]:overflow-x-auto [&_pre]:p-4 [&_pre]:pr-12 [&_pre]:text-sm",
					className,
				)}
				dangerouslySetInnerHTML={{ __html: darkHtml }}
			/>
		</>
	);
}

function InlineCodeInternal({
	code,
	language,
	className,
}: {
	code: string;
	language?: string;
	className?: string;
}) {
	const lightHtml = highlightWithShiki({
		code,
		language,
		theme: "github-light",
		inline: true,
	});
	const darkHtml = highlightWithShiki({
		code,
		language,
		theme: "github-dark",
		inline: true,
	});

	return (
		<>
			<span
				className={cn("dark:hidden", className)}
				dangerouslySetInnerHTML={{ __html: lightHtml }}
			/>
			<span
				className={cn("hidden dark:inline", className)}
				dangerouslySetInnerHTML={{ __html: darkHtml }}
			/>
		</>
	);
}

export function CodeBlock({
	lang,
	content,
	onCopy,
}: {
	lang?: string;
	content: string;
	onCopy?: () => void;
}) {
	return (
		<div className="relative w-full">
			<CodeBlockButtons content={content} onCopy={onCopy} />
			<div className="overflow-x-auto">
				<CodeBlockInternal lang={lang} content={content} className="w-full" />
			</div>
		</div>
	);
}

export function InlineCode({
	code,
	language,
}: {
	code: string;
	language?: string;
}) {
	return (
		<span className="relative inline-block max-w-full">
			<InlineCodeInternal
				code={code}
				language={language}
				className="inline-block"
			/>
		</span>
	);
}

export function Code({
	code,
	language,
	isInline = false,
	onCopy,
}: {
	code: string;
	language?: string;
	isInline?: boolean;
	onCopy?: () => void;
}) {
	if (isInline) {
		return <InlineCode code={code} language={language} />;
	}

	return (
		<div className="not-prose w-full overflow-auto rounded border dark:border-neutral-700 border-neutral-300 [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-500 [&::-webkit-scrollbar-track]:bg-gray-100 dark:[&::-webkit-scrollbar-track]:bg-neutral-700 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar]:w-2">
			<CodeBlock lang={language} content={code} onCopy={onCopy} />
		</div>
	);
}
