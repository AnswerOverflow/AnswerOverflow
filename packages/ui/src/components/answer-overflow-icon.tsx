"use client";

import { cn } from "../lib/utils";

export const AnswerOverflowIcon = (props: {
	size?: number;
	className?: string;
}) => {
	const size = props.size || 32;

	return (
		<div className={cn("relative", props.className)}>
			<img
				src="/icon_light.svg"
				alt="AnswerOverflow"
				width={size}
				height={size}
				className="dark:hidden"
			/>
			<img
				src="/icon_dark.svg"
				alt="AnswerOverflow"
				width={size}
				height={size}
				className="hidden dark:block"
			/>
		</div>
	);
};
