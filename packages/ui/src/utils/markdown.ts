import { createContext, useContext, useEffect, useState } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { markedHighlight } from 'marked-highlight';
import { BUNDLED_LANGUAGES, getHighlighter, Highlighter, Lang } from 'shiki';
import './markdown.css';

export const MarkdownContext = createContext<{
	langs: Lang[];
	setLangs: (langs: Lang[]) => void;
	highlighter: Promise<Highlighter>;
} | null>(null);

export const useMarkdownContext = () => {
	const context = useContext(MarkdownContext);

	if (!context) {
		throw new Error(
			'useMarkdownContext must be used within a MarkdownContextProvider',
		);
	}

	const requestLang = async (requestedLang: string) => {
		const langs = await context.highlighter.then((highlighter) => {
			return highlighter.getLoadedLanguages();
		});

		if (!langs.includes(requestedLang)) {
			const isLangSupported =
				BUNDLED_LANGUAGES.filter((bundle) => {
					return (
						bundle.id === requestedLang ||
						bundle.aliases?.includes(requestedLang)
					);
				}).length > 0;

			if (!isLangSupported) return false;

			await context.highlighter.then(async (highlighter) => {
				return highlighter.loadLanguage(requestedLang as Lang);
			});

			return true;
		}

		return true;
	};

	return {
		langs: context.langs,
		highlighter: context.highlighter,
		requestLang,
	};
};

export const useParsedMarkdown = (content: string) => {
	const [safeHtml, setSafeHtml] = useState<string>('');
	const { highlighter, requestLang } = useMarkdownContext();

	// HTML Encode content with regex
	// const REGEX_HTML_ENCODE = /[\u00A0-\u9999<>\&]/gim;
	//
	// const HTML_ENCODE_CODES = {
	// 	'<': '&lt;',
	// 	'>': '&gt;',
	// 	'&': '&amp;',
	// 	'"': '&quot;',
	// 	"'": '&apos;',
	// 	'/': '&#x2F;',
	// };
	//
	// content = String(content).replace(REGEX_HTML_ENCODE, function (chr) {
	// 	return HTML_ENCODE_CODES[chr];
	// });
	//
	// console.log(content);

	useEffect(() => {
		(async () => {
			const mayIncludeCode = content.includes('```');

			if (mayIncludeCode) {
				const lines = content.split('\n');

				content = lines
					.map((line) => {
						if (line.trim().startsWith('```')) {
							return line.trim();
						}

						return line;
					})
					.join('\n');
			}

			marked.use(
				markedHighlight({
					highlight: async (code, lang) => {
						const isSupported = await requestLang(lang);

						if (!isSupported) return code;

						const text = await highlighter.then((highlighterReturned) => {
							return highlighterReturned.codeToHtml(code, lang);
						});

						return text;
					},
					async: true,
				}),
			);

			const [parsedHtml] = await Promise.all([marked(content)]);
			const safeHtml = DOMPurify.sanitize(parsedHtml);

			return setSafeHtml(safeHtml);
		})();
	}, [content]);

	return safeHtml;
};
