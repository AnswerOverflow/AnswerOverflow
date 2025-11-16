"use client";

import { useState } from "react";
import { cn } from "../../lib/utils";

export function Spoiler({ children }: { children: React.ReactNode }) {
	const [isOpen, setIsOpen] = useState(false);

	return (
		<span
			className={cn(
				"not-prose inline-block w-fit select-none rounded border border-neutral-300 px-1 leading-[22px] transition-all",
				{
					"cursor-pointer bg-neutral-400 text-transparent hover:bg-neutral-700":
						!isOpen,
					"bg-neutral-100": isOpen,
				},
			)}
			draggable="false"
			onClick={() => setIsOpen(true)}
		>
			{children}
		</span>
	);
}
