import { useState } from 'react';
import { getHighlighter, Lang, setCDN } from 'shiki';
import { MarkdownContext } from '~ui/utils/markdown';
// const themeUrl = new URL(
// 	'shiki/themes/nord.json',
// 	import.meta.url,
// ).href.replace('/nord.json', '');
// const languagesUrl = new URL(
// 	'shiki/languages/tsx.tmLanguage.json',
// 	import.meta.url,
// ).href.replace('/tsx.tmLanguage.json', '');
// const wasmUrl = new URL('shiki/dist/onig.wasm', import.meta.url).href.replace(
// 	'/onig.wasm',
// 	'',
// );

export function MarkdownContextProvider(props: { children: React.ReactNode }) {
	const [langsState, setLangsState] = useState<Lang[]>([]);

	setCDN('/_next/static/shiki/');

	const highlighter = getHighlighter({
		theme: 'github-dark',
		langs: langsState,
	});

	return (
		<MarkdownContext.Provider
			value={{
				langs: langsState,
				highlighter: highlighter,
				setLangs: setLangsState,
			}}
		>
			{props.children}
		</MarkdownContext.Provider>
	);
}
