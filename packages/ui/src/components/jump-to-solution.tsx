"use client";

import { Link } from "./link";
import { useMessageResultPageContext } from "./message-result-page-context";

export function JumpToSolution(props: { id: string }) {
	const { scrollToMessage } = useMessageResultPageContext();
	return (
		<Link
			href={`#solution-${props.id}`}
			onClick={(event) => {
				// The solution reply lives in a virtualized list, so the browser
				// cannot resolve the anchor until the list has rendered it.
				if (scrollToMessage(props.id)) {
					event.preventDefault();
				}
			}}
			className="text-blue-600 hover:underline dark:text-blue-400"
		>
			Jump to solution
		</Link>
	);
}
