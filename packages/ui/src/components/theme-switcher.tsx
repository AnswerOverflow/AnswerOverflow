"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "./button";

export function ThemeSwitcher() {
	const { theme, setTheme } = useTheme();

	return (
		<Button
			onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
			variant="ghost"
			size="icon"
		>
			<Sun className="h-5 w-5 stroke-zinc-900 dark:hidden" />
			<Moon className="hidden h-5 w-5 stroke-white dark:block" />
			<span className="sr-only">Change Theme</span>
		</Button>
	);
}
