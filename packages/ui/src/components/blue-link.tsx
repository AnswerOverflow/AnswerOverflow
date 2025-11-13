import type React from "react";
import { cn } from "../lib/utils";
import { Link } from "./link";

export const BlueLink = (
	props: React.ComponentPropsWithoutRef<typeof Link> & {
		href: string;
	},
) => {
	const { className, ...rest } = props;
	return (
		<Link
			className={cn(
				"text-blue-600 hover:underline dark:text-blue-400",
				className,
			)}
			{...rest}
		/>
	);
};
