import React from "react";
import { cn } from "../lib/utils";
import { Link, type LinkProps } from "./link";

export function BlueLink({
	className,
	...props
}: LinkProps & {
	href: string;
	target?: string;
	rel?: string;
	title?: string;
}) {
	return (
		<Link
			{...props}
			target={props.target ?? "_blank"}
			rel={props.rel ?? "noopener ugc nofollow"}
			className={cn(
				"text-blue-600 hover:underline dark:text-blue-400",
				className,
			)}
		/>
	);
}
