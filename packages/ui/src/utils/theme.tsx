import React, { useCallback } from 'react';

type CSSRule = {
	style: {
		color: string;
	};
};
function disableTransitionsTemporarily() {
	document.documentElement.classList.add('[&_*]:!transition-none');
	window.setTimeout(() => {
		document.documentElement.classList.remove('[&_*]:!transition-none');
	}, 0);
}

function changeCodeHighlighting(theme: 'light' | 'dark') {
	// This is disgusting, but it works for switching the code highlighting
	let darkStyleSheet: CSSStyleSheet | undefined;
	let lightStyleSheet: CSSStyleSheet | undefined;
	[...document.styleSheets].forEach((styleSheet) => {
		try {
			const rule = [...styleSheet.cssRules].find((rule) =>
				rule.cssText.includes('hljs-keyword'),
			) as CSSRule | undefined;

			if (rule) {
				if (rule.style.color === 'rgb(255, 123, 114)') {
					darkStyleSheet = styleSheet;
				} else if (rule.style.color === 'rgb(215, 58, 73)') {
					lightStyleSheet = styleSheet;
				}
			}
		} catch (error) {
			// let error pass
		}
	});
	if (darkStyleSheet && lightStyleSheet) {
		darkStyleSheet.disabled = theme === 'light';
		lightStyleSheet.disabled = theme === 'dark';
	}
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export const ThemeContext = React.createContext<{
	theme: 'light' | 'dark';
	toggleTheme: (override?: 'light' | 'dark') => void;
} | null>(null);

export const useThemeContext = () => {
	const theme = React.useContext(ThemeContext);
	if (!theme) {
		throw new Error('useThemeContext must be used within a ThemeProvider');
	}
	return theme;
};

export const ThemeProvider = (props: {
	children: React.ReactNode;
	defaultTheme?: 'light' | 'dark';
}) => {
	const [theme, setTheme] = React.useState<'light' | 'dark'>(
		props.defaultTheme || 'dark',
	);

	const toggleTheme = useCallback(
		(themeOverride?: 'light' | 'dark') => {
			disableTransitionsTemporarily();
			const root = window.document.documentElement;
			const documentTheme = root.classList.contains('dark') ? 'dark' : 'light';

			let newTheme =
				themeOverride || (documentTheme === 'dark' ? 'light' : 'dark');
			if (process.env.STORYBOOK && props.defaultTheme) {
				newTheme = props.defaultTheme; // Bit of a hack to make previews work
			}
			root.classList.toggle('dark', newTheme === 'dark');
			changeCodeHighlighting(newTheme);
			window.localStorage.theme = newTheme;
			setTheme(newTheme);
		},
		[props.defaultTheme],
	);

	React.useEffect(() => {
		const darkModeMediaQuery = window.matchMedia(
			'(prefers-color-scheme: dark)',
		);

		const isSystemDarkMode = darkModeMediaQuery.matches;
		const storedTheme = window.localStorage.theme as
			| 'dark'
			| 'light'
			| undefined;

		if (storedTheme === undefined) {
			toggleTheme(isSystemDarkMode ? 'dark' : 'light');
		} else {
			toggleTheme(storedTheme);
		}
	}, [toggleTheme]);

	return (
		<ThemeContext.Provider
			value={{
				theme,
				toggleTheme,
			}}
		>
			{props.children}
		</ThemeContext.Provider>
	);
};
