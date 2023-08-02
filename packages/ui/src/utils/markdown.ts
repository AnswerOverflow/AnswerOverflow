import { createContext, useEffect, useState } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { markedHighlight } from 'marked-highlight';
import { getHighlighter } from 'shiki';
import './markdown.css';

const themeUrl = new URL(
	'shiki/themes/nord.json',
	import.meta.url,
).href.replace('/nord.json', '');

const languagesUrl = new URL(
	'shiki/languages/tsx.tmLanguage.json',
	import.meta.url,
).href.replace('/tsx.tmLanguage.json', '');

const wasmUrl = new URL('shiki/dist/onig.wasm', import.meta.url).href.replace(
	'/onig.wasm',
	'',
);

export const useParsedMarkdown = (content: string) => {
	const [safeHtml, setSafeHtml] = useState<string>('');

	const highlighter = getHighlighter({
		theme: 'github-dark',
		langs: ['typescript', 'python'],
		paths: {
			themes: themeUrl,
			languages: languagesUrl,
			wasm: wasmUrl,
		},
	});

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
						const text = await highlighter.then((highlighterReturned) => {
							return highlighterReturned.codeToHtml(code, lang);
						});

						return text;
					},
					async: true,
				}),
			);

			// if (typeof window === 'undefined') {
			// 	const { JSDOM } = await import('jsdom');
			//
			// 	const window = new JSDOM('').window;
			//
			// 	const parsedHtml = marked.parse(content);
			// 	const purify = DOMPurify(window);
			// 	const sanitizedHtml = purify.sanitize(parsedHtml);
			//
			// 	return setSafeHtml(sanitizedHtml);
			// }
			const [parsedHtml] = await Promise.all([marked(content)]);
			const safeHtml = DOMPurify.sanitize(parsedHtml);

			return setSafeHtml(safeHtml);
		})();
	}, [content]);

	return safeHtml;
};
