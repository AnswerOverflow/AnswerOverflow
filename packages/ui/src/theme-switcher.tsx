'use client';
import { useTheme } from 'next-themes';
import { Button } from './ui/button';
import { SunMoonIcon } from 'lucide-react';

function SunIcon<T extends object>(props: T) {
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

function MoonIcon<T extends object>(props: T) {
	return (
		<svg viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
			<path d="M15.224 11.724a5.5 5.5 0 0 1-6.949-6.949 5.5 5.5 0 1 0 6.949 6.949Z" />
		</svg>
	);
}

const possibleThemes = ['light', 'dark', 'system'];

// eslint-disable-next-line @typescript-eslint/naming-convention
export function ThemeSwitcher() {
	const { theme, setTheme } = useTheme();
	const currentTheme = theme ?? 'system';
	const currentIndex = possibleThemes.indexOf(currentTheme);

	return (
		<Button
			onClick={() => {
				const nextIndex = (currentIndex + 1) % possibleThemes.length;
				const nextTheme = possibleThemes[nextIndex]!;
				setTheme(nextTheme);
			}}
			variant={'ghost'}
			size={'icon'}
		>
			{currentTheme === 'system' ? (
				<SunMoonIcon className="h-6 w-6 text-zinc-900 dark:text-white" />
			) : currentTheme === 'dark' ? (
				<MoonIcon className="h-9 w-9 stroke-white" />
			) : (
				<SunIcon className="h-9 w-9 stroke-zinc-900" />
			)}
			<span className="sr-only">Change Theme</span>
		</Button>
	);
}
