import { createContext, useContext, useEffect, useState } from 'react';
import { marked, type Token } from 'marked';
import DOMPurify from 'dompurify';
import { markedHighlight } from 'marked-highlight';
import { BUNDLED_LANGUAGES, Highlighter, Lang } from 'shiki';
import './markdown.css';
import { TokenizerAndRendererExtension } from 'MarkedOptions';

// eslint-disable-next-line @typescript-eslint/naming-convention
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
	const EMOJI_REGEX = /^(&lt;|<)(a?):[a-zA-Z0-9-]+:\d+(&gt;|>)/;

	useEffect(() => {
		void (async () => {
			// Format emojis
			marked.use({
				renderer: {
					text: (text) => {
						return text
							.split(' ')
							.map((word) => {
								const match = word.match(EMOJI_REGEX);

								if (match) {
									const formattedText = match[0]
										.replace(/&lt;/g, '')
										.replace(/&gt;/g, '')
										.replace(/</g, '')
										.replace(/>/g, '');
									const [animatedToken, emojiName, emojiId] =
										formattedText.split(':');
									return `<img class="emoji" src="https://cdn.discordapp.com/emojis/${emojiId}.${
										animatedToken === 'a' ? 'gif' : 'png'
									}?v=1" alt="${emojiName} emoji" onerror="this.classList.add('broken-image');"  />`;
								}

								return word;
							})
							.join(' ');
					},
				},
			});

			// Disable table, strong, and quote default tokenizers
			marked.use({
				tokenizer: {
					// @ts-expect-error we are telling marked not to tokenize tables
					table: () => {},
					// @ts-expect-error we are telling marked not to tokenize strong (bold, italic, underline)
					emStrong: () => {},
					// @ts-expect-error we are telling marked not to tokenize blockquotes
					blockquote: () => {},
				},
			});

			// Format headings
			marked.use({
				renderer: {
					heading: (text, level) => {
						return `<p class="heading-${level}">${text}</p>`;
					},
				},
			});

			const HTML_ESCAPE_MAP = {
				'<': '&lt;',
				'>': '&gt;',
			};

			let escapedContent = content.replace(/[<>]/g, (char) => {
				return HTML_ESCAPE_MAP[char as keyof typeof HTML_ESCAPE_MAP];
			});

			const mayIncludeCode = escapedContent.includes('```');

			if (mayIncludeCode) {
				const lines = escapedContent.split('\n');

				escapedContent = lines
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
						code = code.replace(/&lt;/g, '<').replace(/&gt;/g, '>');
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

			// Handle underlines
			const underline: TokenizerAndRendererExtension = {
				name: 'underline',
				level: 'inline',
				start(src: string) {
					return src.match(/^__(.*?)__/)?.index;
				},
				tokenizer(src: string) {
					const match = src.match(/^__(.*?)__/);

					if (match) {
						return {
							type: 'underline',
							raw: match[0],
							text: match[1],
							tokens: [],
						};
					}

					return undefined;
				},
				renderer(token: Token) {
					if (token.type === 'underline') {
						return `<u>${token.text}</u>`;
					}

					return false;
				},
			};

			// Handle italics
			const ITALICS_REGEX = /(?<!\*)\*([^*]+)\*(?!\*)/;
			const italics: TokenizerAndRendererExtension = {
				name: 'italics',
				level: 'inline',
				start(src: string) {
					return src.match(ITALICS_REGEX)?.index;
				},
				tokenizer(src: string) {
					const match = src.match(ITALICS_REGEX);

					if (match) {
						return {
							type: 'italics',
							raw: match[0],
							text: match[1],
							tokens: [],
						};
					}

					return undefined;
				},
				renderer(token: Token) {
					if (token.type === 'italics') {
						return `<i>${token.text}</i>`;
					}

					return false;
				},
			};

			// Handle bold
			const BOLD_REGEX = /(?<!\*)\*\*([^*]+)\*\*(?!\*)/;

			const bold: TokenizerAndRendererExtension = {
				name: 'bold',
				level: 'inline',
				start(src: string) {
					return src.match(BOLD_REGEX)?.index;
				},
				tokenizer(src: string) {
					const match = src.match(BOLD_REGEX);

					if (match) {
						return {
							type: 'bold',
							raw: match[0],
							text: match[1],
							tokens: [],
						};
					}

					return undefined;
				},
				renderer(token: Token) {
					if (token.type === 'bold') {
						return `<b>${token.text}</b>`;
					}

					return false;
				},
			};

			// Handle quotes
			const QUOTE_REGEX = /^(>|&gt;)\s.*/;

			const quote: TokenizerAndRendererExtension = {
				name: 'quote',
				level: 'inline',
				start(src: string) {
					return src.match(QUOTE_REGEX)?.index;
				},
				tokenizer(src: string) {
					const match = src.match(QUOTE_REGEX);

					if (match) {
						return {
							type: 'quote',
							raw: match[0],
							text: match[0],
							tokens: [],
						};
					}

					return undefined;
				},
				renderer(
					token: Token & {
						text?: string;
					},
				) {
					if (token.type === 'quote' && token.text) {
						const text = token.text.replace(/&gt;/g, '');

						return `<blockquote>${text}</blockquote>`;
					}

					return false;
				},
			};

			marked.use({
				extensions: [underline, italics, bold, quote],
			});

			let parsedHtml = await marked(escapedContent, {
				async: true,
			});
			parsedHtml = parsedHtml.replace(/&amp;/g, '&');
			const safeHtml = DOMPurify.sanitize(parsedHtml);

			return setSafeHtml(safeHtml);
		})();
	}, [EMOJI_REGEX, content, highlighter, requestLang]);

	return safeHtml;
};
