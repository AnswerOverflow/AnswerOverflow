import React, { useCallback } from 'react';

function disableTransitionsTemporarily() {
	document.documentElement.classList.add('[&_*]:!transition-none');
	window.setTimeout(() => {
		document.documentElement.classList.remove('[&_*]:!transition-none');
	}, 0);
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
			root.dataset.theme = newTheme;
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
