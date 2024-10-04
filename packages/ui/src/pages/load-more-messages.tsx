'use client';
import React from 'react';
import { Button } from '../ui/button';
import { useMessageResultPageContext } from './message-result-page-context';

export function LoadMoreMessages(props: { messages: React.ReactNode[] }) {
	const { setShowAllMessages, showAllMessages } = useMessageResultPageContext();
	const limit = 15;
	const shouldShowLoadMoreButton =
		props.messages.length > limit && !showAllMessages;
	return (
		<div>
			{props.messages.slice(0, showAllMessages ? props.messages.length : limit)}
			{shouldShowLoadMoreButton && (
				<div className="flex w-full items-center justify-center">
					<Button
						onClick={() => {
							setShowAllMessages(true);
						}}
					>
						Load more
					</Button>
				</div>
			)}
		</div>
	);
}
