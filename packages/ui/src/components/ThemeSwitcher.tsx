import { useThemeContext } from '~ui/utils/theme';

function SunIcon<T extends {}>(props: T) {
	return (
		<svg viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
			<path d="M12.5 10a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Z" />
			<path
				strokeLinecap="round"
				d="M10 5.5v-1M13.182 6.818l.707-.707M14.5 10h1M13.182 13.182l.707.707M10 15.5v-1M6.11 13.889l.708-.707M4.5 10h1M6.11 6.111l.708.707"
			/>
		</svg>
	);
}

function MoonIcon<T extends {}>(props: T) {
	return (
		<svg viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
			<path d="M15.224 11.724a5.5 5.5 0 0 1-6.949-6.949 5.5 5.5 0 1 0 6.949 6.949Z" />
		</svg>
	);
}

export function ThemeIcon() {
	return (
		<>
			<SunIcon className="h-8 w-8 stroke-zinc-900 dark:hidden" />
			<MoonIcon className="hidden h-8 w-8 stroke-white dark:block" />
		</>
	);
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export function ThemeSwitcher({
	Switcher,
}: {
	Switcher?: React.FC<{
		toggleTheme: () => void;
	}>;
}) {
	const { toggleTheme } = useThemeContext();
	if (!Switcher)
		return (
			<button
				type="button"
				className="flex h-9 w-9 items-center justify-center rounded-md transition hover:bg-zinc-900/5 dark:hover:bg-white/5"
				aria-label="Toggle dark mode"
				onClick={() => toggleTheme()}
			>
				<ThemeIcon />
			</button>
		);
	return <Switcher toggleTheme={() => toggleTheme()} />;
}
