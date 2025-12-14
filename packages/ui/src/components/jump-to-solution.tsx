"use client";

import { Link } from "./link";
import { useMessageResultPageContext } from "./message-result-page-context";

export function JumpToSolution(props: { id: string }) {
	const { setShowAllMessages } = useMessageResultPageContext();
	return (
		<Link
			href={`#solution-${props.id}`}
			onClick={() => {
				setShowAllMessages(true);
			}}
			className="text-blue-600 hover:underline dark:text-blue-400"
		>
			Jump to solution
		</Link>
	);
}
