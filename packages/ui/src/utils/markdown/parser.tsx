import { marked, type Token, type MarkedExtension } from 'marked';
import { markedHighlight } from 'marked-highlight';
import { Code } from 'bright';
import './style.css';
import { TokenizerAndRendererExtension } from 'MarkedOptions';
import React from 'react';
import { JSDOM } from 'jsdom';
import DOMPurify from 'dompurify';

Code.theme = {
	dark: 'github-dark',
	light: 'github-light',
	// using a different CSS selector:
	// lightSelector: '[data-theme="light"]',
	lightSelector: 'html.light',
	// lightSelector: 'style={color-schema: light;}',
};
const EMOJI_REGEX = /^(&lt;|<)(a?):[a-zA-Z0-9-]+:\d+(&gt;|>)/;

const emojiExtension: MarkedExtension = {
	renderer: {
		text: (text) => {
			return text // there's a faster way to do this
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

						if (!emojiId) return word;

						return `<img class="emoji" src="https://cdn.discordapp.com/emojis/${emojiId}.${
							animatedToken === 'a' ? 'gif' : 'png'
						}?v=1" alt="${
							emojiName ?? 'emoji'
						} emoji" onerror="this.classList.add('broken-image');"  />`;
					}

					return word;
				})
				.join(' ');
		},
	},
};

const headingExtension: MarkedExtension = {
	renderer: {
		heading: (text, level) => {
			return `<p class="heading-${level}">${text}</p>`;
		},
	},
};

// Dynamic import due to next throwing an error for trying to use react dom on server
const { renderToStaticNodeStream } = await import('react-dom/server');
const highlightExtension = markedHighlight({
	highlight: async (code, lang) => {
		// Hacky
		return new Promise((resolve, reject) => {
			let buf = '';
			const stream = renderToStaticNodeStream(<Code lang={lang}>{code}</Code>);
			stream.on('data', (chunk: Buffer) => {
				buf += chunk.toString();
			});
			stream.on('end', () => {
				resolve(buf);
			});
			setTimeout(() => {
				reject('Timed out');
			}, 5000);
		});
	},
	async: true,
});

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
const ITALICS_REGEX = /(\*|_)(.*?)\1/;
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
			return `<blockquote className="bg-gray-600">${token.text}</blockquote>`;
		}

		return false;
	},
};

export const parseDiscordMarkdown = async (content: string) => {
	// Format emojis
	marked.use(emojiExtension);

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
	marked.use(headingExtension);

	marked.use(highlightExtension);

	marked.use({
		extensions: [quote, underline, bold],
	});
	const parsed = await marked(content, {
		async: true,
		breaks: true,
	});
	const purify = DOMPurify(new JSDOM('<!DOCTYPE html>').window);
	const clean = purify.sanitize(parsed);
	return clean;
};
