'use client';
import { useTheme } from 'next-themes';
import React from 'react';
import { LuMoon, LuSun } from 'react-icons/lu';
import { DropdownMenuItem } from '../ui/dropdown-menu';

export function ChangeThemeItem() {
	const { theme, setTheme } = useTheme();

	return (
		<DropdownMenuItem
			onClick={() => {
				setTheme(theme === 'dark' ? 'light' : 'dark');
			}}
		>
			<LuSun className="mr-2 block h-4 w-4 dark:hidden" />
			<LuMoon className="mr-2 hidden h-4 w-4 dark:block" />

			<span className="w-full">Change Theme</span>
		</DropdownMenuItem>
	);
}
