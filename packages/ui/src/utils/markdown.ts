import { useEffect, useState } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import Prism from 'prismjs';
import { markedHighlight } from 'marked-highlight';
import 'prismjs/components/prism-typescript';

export const useParsedMarkdown = (content: string) => {
	const [safeHtml, setSafeHtml] = useState<string>('');

	useEffect(() => {
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
				highlight: (code, lang) => {
					if (Prism.languages[lang]) {
						console.log('exists');
						return Prism.highlight(code, Prism.languages.typescript, lang);
					} else {
						console.log('does not exist');
						return code;
					}
				},
			}),
		);

		if (typeof window === 'undefined') {
			(async () => {
				const { JSDOM } = await import('jsdom');

				const window = new JSDOM('').window;

				const parsedHtml = marked.parse(content);
				const purify = DOMPurify(window);
				const sanitizedHtml = purify.sanitize(parsedHtml);

				return setSafeHtml(sanitizedHtml);
			})();
		}

		const parsedHtml = marked.parse(content);
		const safeHtml = DOMPurify.sanitize(parsedHtml);

		return setSafeHtml(safeHtml);
	}, [content, window]);

	return safeHtml;
};
