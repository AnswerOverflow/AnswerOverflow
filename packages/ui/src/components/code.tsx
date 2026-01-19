"use client";

import { Button } from "@packages/ui/components/button";
import langBash from "@shikijs/langs/bash";
import langCss from "@shikijs/langs/css";
import langHtml from "@shikijs/langs/html";
import langJavascript from "@shikijs/langs/javascript";
import langJson from "@shikijs/langs/json";
import langJsx from "@shikijs/langs/jsx";
import langMarkdown from "@shikijs/langs/markdown";
import langPython from "@shikijs/langs/python";
import langRust from "@shikijs/langs/rust";
import langSql from "@shikijs/langs/sql";
import langTsx from "@shikijs/langs/tsx";
import langTypescript from "@shikijs/langs/typescript";
import langYaml from "@shikijs/langs/yaml";
import githubDark from "@shikijs/themes/github-dark";
import githubLight from "@shikijs/themes/github-light";
import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { createHighlighterCoreSync } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import { cn } from "../lib/utils";

const shiki = createHighlighterCoreSync({
	themes: [githubDark, githubLight],
	langs: [
		langTypescript,
		langJavascript,
		langJson,
		langBash,
		langCss,
		langHtml,
		langMarkdown,
		langPython,
		langRust,
		langSql,
		langYaml,
		langTsx,
		langJsx,
	],
	engine: createJavaScriptRegexEngine(),
});

function highlightCode(
	code: string,
	lang: string | undefined,
	theme: "light" | "dark",
) {
	const loadedLangs = shiki.getLoadedLanguages();
	const language = lang?.toLowerCase() || "text";
	const langToUse = loadedLangs.includes(language) ? language : "text";

	return shiki.codeToHtml(code, {
		lang: langToUse,
		theme: theme === "dark" ? "github-dark" : "github-light",
	});
}

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
	theme,
	className,
}: {
	lang?: string;
	content: string;
	theme: "light" | "dark";
	className?: string;
}) {
	const html = highlightCode(content, lang, theme);

	return (
		<div
			data-theme={theme}
			className={`[&_pre]:p-4 [&_pre]:pr-12 [&_pre]:m-0 [&_pre]:w-fit [&_pre]:min-w-full ${className || ""}`}
			// biome-ignore lint/security/noDangerouslySetInnerHtml: Required for Shiki syntax highlighting
			dangerouslySetInnerHTML={{ __html: html }}
		/>
	);
}

function InlineCodeInternal({
	code,
	language,
	theme,
	className,
}: {
	code: string;
	language?: string;
	theme: "light" | "dark";
	className?: string;
}) {
	const html = highlightCode(code, language, theme);

	return (
		<span
			className={cn(
				"inline-code not-prose inline-block align-middle rounded border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 text-sm *:whitespace-normal max-w-full overflow-x-auto",
				className,
			)}
			data-theme={theme}
			// biome-ignore lint/security/noDangerouslySetInnerHtml: Required for Shiki syntax highlighting
			dangerouslySetInnerHTML={{ __html: html }}
		/>
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
				<CodeBlockInternal
					lang={lang}
					content={content}
					theme="light"
					className="dark:hidden block w-full"
				/>
				<CodeBlockInternal
					lang={lang}
					content={content}
					theme="dark"
					className="hidden dark:block w-full"
				/>
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
				theme="light"
				className="dark:hidden inline-block"
			/>
			<InlineCodeInternal
				code={code}
				language={language}
				theme="dark"
				className="hidden dark:inline-block"
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
