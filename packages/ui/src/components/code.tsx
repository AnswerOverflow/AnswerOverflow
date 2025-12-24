"use client";

import { Button } from "@packages/ui/components/button";
import { Check, Copy, WrapText } from "lucide-react";
import { use, useState } from "react";
import type { BundledLanguage, BundledTheme, HighlighterGeneric } from "shiki";
import { createHighlighter } from "shiki";
import { cn } from "../lib/utils";

const COMMON_LANGUAGES: BundledLanguage[] = [
	"javascript",
	"typescript",
	"jsx",
	"tsx",
	"json",
	"html",
	"css",
	"markdown",
	"bash",
	"shell",
	"python",
	"rust",
	"go",
	"java",
	"c",
	"cpp",
	"csharp",
	"ruby",
	"php",
	"sql",
	"yaml",
	"toml",
	"xml",
	"diff",
];

const THEMES: BundledTheme[] = ["github-dark", "github-light"];

let highlighterPromise: Promise<
	HighlighterGeneric<BundledLanguage, BundledTheme>
> | null = null;
let highlighterInstance: HighlighterGeneric<
	BundledLanguage,
	BundledTheme
> | null = null;

function getHighlighter(): Promise<
	HighlighterGeneric<BundledLanguage, BundledTheme>
> {
	if (highlighterInstance) {
		return Promise.resolve(highlighterInstance);
	}

	if (!highlighterPromise) {
		highlighterPromise = createHighlighter({
			themes: THEMES,
			langs: COMMON_LANGUAGES,
		}).then((h) => {
			highlighterInstance = h;
			return h;
		});
	}

	return highlighterPromise;
}

if (typeof window !== "undefined") {
	getHighlighter();
}

const highlightCache = new Map<string, Promise<string>>();

function getHighlightedCode(
	code: string,
	lang: string | undefined,
	theme: "light" | "dark",
): Promise<string> {
	const cacheKey = `${code}-${lang}-${theme}`;
	const cached = highlightCache.get(cacheKey);
	if (cached) {
		return cached;
	}

	const promise = (async () => {
		try {
			const highlighter = await getHighlighter();
			const language = (lang?.toLowerCase() || "plaintext") as BundledLanguage;

			const loadedLangs = highlighter.getLoadedLanguages();
			if (!loadedLangs.includes(language)) {
				try {
					await highlighter.loadLanguage(language);
				} catch {
					return highlighter.codeToHtml(code, {
						lang: "plaintext",
						theme: theme === "dark" ? "github-dark" : "github-light",
					});
				}
			}

			return highlighter.codeToHtml(code, {
				lang: language,
				theme: theme === "dark" ? "github-dark" : "github-light",
			});
		} catch {
			return `<pre class="shiki"><code>${code.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</code></pre>`;
		}
	})();

	highlightCache.set(cacheKey, promise);
	return promise;
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
	const html = use(getHighlightedCode(content, lang, theme));

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
	const html = use(getHighlightedCode(code, language, theme));

	return (
		<span
			className={cn(
				"inline-code not-prose inline-block rounded border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 text-sm *:whitespace-normal",
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
}: {
	lang?: string;
	content: string;
}) {
	const [wrap, setWrap] = useState(false);

	return (
		<div className="relative w-full">
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
					className="dark:hidden block w-full"
				/>
				<CodeBlockInternal
					lang={lang}
					content={content}
					theme="dark"
					wrap={wrap}
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
		<span className="relative inline-block">
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
}: {
	code: string;
	language?: string;
	isInline?: boolean;
}) {
	if (isInline) {
		return <InlineCode code={code} language={language} />;
	}

	return (
		<div className="not-prose w-full overflow-auto rounded border dark:border-neutral-700 border-neutral-300 [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-500 [&::-webkit-scrollbar-track]:bg-gray-100 dark:[&::-webkit-scrollbar-track]:bg-neutral-700 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar]:w-2">
			<CodeBlock lang={language} content={code} />
		</div>
	);
}
