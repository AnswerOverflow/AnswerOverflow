'use client';

import { BlueLink } from '../ui/blue-link';
import { useMessageResultPageContext } from './message-result-page-context';

export function JumpToSolution(props: { id: string }) {
	const { setShowAllMessages } = useMessageResultPageContext();
	return (
		<BlueLink
			href={`#solution-${props.id}`}
			onClick={() => {
				setShowAllMessages(true);
			}}
		>
			Jump to solution
		</BlueLink>
	);
}
