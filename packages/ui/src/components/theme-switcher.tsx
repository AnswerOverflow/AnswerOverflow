"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "../lib/utils";

export function ThemeSwitcher() {
	const { theme, setTheme } = useTheme();
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	const options = [
		{ value: "system", icon: Monitor, label: "System" },
		{ value: "light", icon: Sun, label: "Light" },
		{ value: "dark", icon: Moon, label: "Dark" },
	];

	return (
		<div className="flex items-center gap-1 rounded-full p-1">
			{options.map((option) => (
				<button
					key={option.value}
					onClick={() => setTheme(option.value)}
					className={cn(
						"rounded-full p-2 transition-colors",
						mounted && theme === option.value
							? "bg-muted/50"
							: "text-muted-foreground hover:text-foreground",
					)}
				>
					<option.icon className="h-4 w-4" />
					<span className="sr-only">{option.label}</span>
				</button>
			))}
		</div>
	);
}
