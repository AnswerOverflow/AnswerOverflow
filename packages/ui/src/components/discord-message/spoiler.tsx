"use client";

import { useState } from "react";
import { cn } from "../../lib/utils";

export function Spoiler({ children }: { children: React.ReactNode }) {
	const [isOpen, setIsOpen] = useState(false);

	const reveal = () => setIsOpen(true);

	return (
		<button
			type="button"
			className={cn(
				"not-prose inline-block w-fit select-none rounded border border-neutral-300 px-1 leading-[22px] transition-all",
				{
					"cursor-pointer bg-neutral-400 text-transparent hover:bg-neutral-700":
						!isOpen,
					"bg-neutral-100": isOpen,
				},
			)}
			draggable="false"
			onClick={reveal}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					reveal();
				}
			}}
			aria-pressed={isOpen}
			aria-label={isOpen ? "Spoiler revealed" : "Click to reveal spoiler"}
		>
			{children}
		</button>
	);
}
