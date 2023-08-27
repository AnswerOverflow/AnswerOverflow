import { useState } from 'react';
import { getHighlighter, Lang } from 'shiki';
import { MarkdownContext } from '~ui/utils/markdown';

export function MarkdownContextProvider(props: { children: React.ReactNode }) {
	const [langsState, setLangsState] = useState<Lang[]>([]);

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
