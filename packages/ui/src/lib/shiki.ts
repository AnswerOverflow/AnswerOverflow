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
import oneDarkPro from "@shikijs/themes/one-dark-pro";
import oneLight from "@shikijs/themes/one-light";
import type { ShikiTransformer } from "shiki";
import { createHighlighterCoreSync } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";

export const shikiThemes = [
	"github-light",
	"github-dark",
	"one-light",
	"one-dark-pro",
] as const;

export type ShikiTheme = (typeof shikiThemes)[number];

const highlighter = createHighlighterCoreSync({
	themes: [githubLight, githubDark, oneLight, oneDarkPro],
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

function escapeHtml(value: string) {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");
}

export function normalizeShikiLanguage(language: string | undefined) {
	const normalizedLanguage = language?.toLowerCase().trim() ?? "";

	switch (normalizedLanguage) {
		case "js":
			return "javascript";
		case "ts":
			return "typescript";
		case "sh":
			return "bash";
		case "yml":
			return "yaml";
		case "bash":
		case "css":
		case "html":
		case "javascript":
		case "json":
		case "jsx":
		case "markdown":
		case "python":
		case "rust":
		case "sql":
		case "tsx":
		case "typescript":
		case "yaml":
			return normalizedLanguage;
		default:
			return null;
	}
}

function renderPlainCode(code: string, inline: boolean) {
	const escapedCode = escapeHtml(code);

	if (inline) {
		return `<code>${escapedCode}</code>`;
	}

	return `<pre><code>${escapedCode}</code></pre>`;
}

export function highlightWithShiki({
	code,
	language,
	theme,
	transformers,
	inline = false,
}: {
	code: string;
	language: string | undefined;
	theme: ShikiTheme;
	transformers?: Array<ShikiTransformer>;
	inline?: boolean;
}) {
	const normalizedLanguage = normalizeShikiLanguage(language);

	if (normalizedLanguage === null) {
		return renderPlainCode(code, inline);
	}

	return highlighter.codeToHtml(code, {
		lang: normalizedLanguage,
		theme,
		transformers,
	});
}
