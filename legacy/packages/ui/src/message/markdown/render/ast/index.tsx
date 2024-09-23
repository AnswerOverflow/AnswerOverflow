/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import text from './text';
import pkg from 'simple-markdown';
const { defaultRules, inlineRegex } = pkg;

const baseRules = {
	newline: defaultRules.newline,
	paragraph: defaultRules.paragraph,
	escape: defaultRules.escape,
	link: defaultRules.link,
	url: defaultRules.url,
	strong: defaultRules.strong,
	em: defaultRules.em,
	u: defaultRules.u,
	br: defaultRules.br,
	inlineCode: defaultRules.inlineCode,

	autolink: {
		...defaultRules.autolink,
		match: inlineRegex(/^<(https?:\/\/[^ >]+)>/),
	},
	blockQuote: {
		...defaultRules.blockQuote,
		match: (
			source: string,
			{
				prevCapture,
			}: {
				prevCapture: string | null;
			},
		) =>
			/^$|\n *$/.test(prevCapture ?? '')
				? /^( *>>> +([\s\S]*))|^( *>(?!>>) +[^\n]*(\n *>(?!>>) +[^\n]*)*\n?)/.exec(
						source,
					)
				: null,
		parse: (
			capture: string[],
			parse: (arg0: any, arg1: any) => any,
			state: any,
		) => ({
			content: parse(capture[0]!.replace(/^ *>(?:>>)? ?/gm, ''), state),
		}),
	},
	emoticon: {
		order: defaultRules.text.order,
		match: (source: string) => /^(¯\\_\(ツ\)_\/¯)/.exec(source),

		parse: (capture: any[]) => ({ type: 'text', content: capture[1] }),
	},
	codeBlock: {
		order: defaultRules.codeBlock.order,
		match: (source: string) =>
			/^```(([A-z0-9-]+?)\n+)?\n*([^]+?)\n*```/.exec(source),
		parse: ([, , lang, content]: string[]) => ({
			lang: (lang || '').trim(),
			content: content || '',
		}),
	},
	// customEmoji,
	text,
	s: {
		order: defaultRules.u.order,
		match: inlineRegex(/^~~([\s\S]+?)~~(?!_)/),
		parse: defaultRules.u.parse,
	},

	spoiler: {
		order: defaultRules.inlineCode.order + 1,
		match: inlineRegex(/^\|\|([\s\S]+?)\|\|/),
		parse: defaultRules.strong.parse,
	},
	//
	// timestamp: {
	// 	order: defaultRules.u.order,
	// 	// https://github.com/discordjs/discord-api-types/blob/638c347dd8a1c5dc39b3626c76749c5f8a4afc6a/globals.ts#L69
	// 	match: inlineRegex(/^<t:(?<timestamp>-?\d{1,13})(:(?<style>[tTdDfFR]))?>/),
	// 	parse: ({ groups }: { groups: any }) => groups,
	// },

	command: {
		order: defaultRules.u.order,
		match: inlineRegex(/^<\/(.+?):\d{17,19}?>/),
		parse: (capture: string[]) => ({ name: capture[1] }),
	},
};

export default baseRules;
