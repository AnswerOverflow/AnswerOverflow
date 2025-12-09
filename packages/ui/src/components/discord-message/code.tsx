"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import DOMPurify from "isomorphic-dompurify";
import type { BundledLanguage } from "shiki";
import { codeToHtml } from "shiki";
import { cn } from "../../lib/utils";
import { CodeBlock } from "../../markdown/render/code-block";

interface InlineCodeInternalProps {
	code: string;
	language?: string;
	theme: "light" | "dark";
	className?: string;
}

function InlineCodeInternal({
	code,
	language,
	theme,
	className,
}: InlineCodeInternalProps) {
	const { data: html } = useSuspenseQuery({
		queryKey: ["code-highlight-inline", code, language, theme],
		queryFn: async () => {
			try {
				const lang = (language?.toLowerCase() || "text") as BundledLanguage;
				const rawHtml = await codeToHtml(code, {
					lang,
					theme: theme === "dark" ? "github-dark" : "github-light",
				});
				return DOMPurify.sanitize(rawHtml);
			} catch {
				return DOMPurify.sanitize(
					`<pre class="shiki"><code>${code.replace(/</g, "&lt;")}</code></pre>`,
				);
			}
		},
		staleTime: Infinity,
	});

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

	return (
		<div className="not-prose w-full overflow-auto rounded border dark:border-neutral-700 border-neutral-300 [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-500 [&::-webkit-scrollbar-track]:bg-gray-100 dark:[&::-webkit-scrollbar-track]:bg-neutral-700 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar]:w-2">
			<CodeBlock lang={language} content={code} />
		</div>
	);
}
