"use client";

import { Button } from "@packages/ui/components/button";
import { Check, Copy } from "lucide-react";
import { useState } from "react";
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
	return (
		<pre
			className={cn(
				"m-0 min-w-full w-fit overflow-x-auto p-4 pr-12 text-sm",
				className,
			)}
		>
			<code data-language={lang}>{content}</code>
		</pre>
	);
}

function InlineCodeInternal({
	code,
	className,
}: {
	code: string;
	className?: string;
}) {
	return (
		<code
			className={cn(
				"inline-code not-prose inline-block align-middle rounded border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 text-sm *:whitespace-normal max-w-full overflow-x-auto",
				className,
			)}
		>
			{code}
		</code>
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

export function InlineCode({ code }: { code: string; language?: string }) {
	return (
		<span className="relative inline-block max-w-full">
			<InlineCodeInternal code={code} className="inline-block" />
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
