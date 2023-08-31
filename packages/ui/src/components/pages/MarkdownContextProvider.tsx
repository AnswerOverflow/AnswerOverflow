import { useState } from 'react';
import { getHighlighter, Lang, setCDN } from 'shiki';
import { MarkdownContext } from '~ui/utils/markdown';
import { webClientEnv } from '@answeroverflow/env/web';

export function MarkdownContextProvider(props: { children: React.ReactNode }) {
	const [langsState, setLangsState] = useState<Lang[]>([]);

	if (!webClientEnv.NEXT_PUBLIC_LADLE) {
		setCDN('/_next/static/shiki/');
	}

	const highlighter = getHighlighter({
		theme: 'github-dark',
		langs: langsState,
		...(webClientEnv.NEXT_PUBLIC_LADLE && {
			paths: {
				themes: new URL('shiki/themes/nord.json', import.meta.url).href.replace(
					'/nord.json',
					'',
				),
				languages: new URL(
					'shiki/languages/tsx.tmLanguage.json',
					import.meta.url,
				).href.replace('/tsx.tmLanguage.json', ''),
				wasm: new URL('shiki/dist/onig.wasm', import.meta.url).href.replace(
					'/onig.wasm',
					'',
				),
			},
		}),
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
