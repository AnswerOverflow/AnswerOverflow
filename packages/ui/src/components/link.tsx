import type React from "react";
import { cn } from "../lib/utils";

export interface LinkProps
	extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
	href: string;
	children: React.ReactNode;
}

export function Link({ className, ...props }: LinkProps) {
	return (
		<a
			{...props}
			className={cn(
				"text-blue-600 hover:underline dark:text-blue-400",
				className,
			)}
		/>
	);
}
