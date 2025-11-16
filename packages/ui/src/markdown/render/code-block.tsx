"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import type { BundledLanguage } from "shiki";
import { codeToHtml } from "shiki";

interface CodeBlockProps {
	lang?: string;
	content: string;
	key?: string;
}

interface CodeBlockInternalProps {
	lang?: string;
	content: string;
	theme: "light" | "dark";
	className?: string;
}

function CodeBlockInternal({
	lang,
	content,
	theme,
	className,
}: CodeBlockInternalProps) {
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
		staleTime: Infinity, // Code highlighting results don't change, so cache indefinitely
	});

	return (
		<div
			className={`overflow-x-scroll [&_pre]:overflow-x-auto [&_pre]:p-4 [&_pre]:rounded ${className || ""}`}
			data-theme={theme}
			// biome-ignore lint/security/noDangerouslySetInnerHtml: Required for Shiki syntax highlighting
			dangerouslySetInnerHTML={{ __html: html }}
		/>
	);
}

export function CodeBlock({ lang, content, key }: CodeBlockProps) {
	return (
		<div key={key} className="relative w-full">
			<CodeBlockInternal
				lang={lang}
				content={content}
				theme="light"
				className={"dark:hidden block w-full"}
			/>
			<CodeBlockInternal
				lang={lang}
				content={content}
				theme="dark"
				className={"hidden dark:block w-full"}
			/>
		</div>
	);
}
