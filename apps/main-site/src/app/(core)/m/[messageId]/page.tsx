import { makeMessageResultPage } from '@answeroverflow/db';
import { MessageResultPage } from '~ui/components/pages/MessageResultPage';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { callAPI } from '@answeroverflow/ui/src/utils/trpc';

export const metadata: Metadata = {};

export default async function MessageResult({
	params,
}: {
	params: { messageId: string };
}) {
	const data = await callAPI({
		apiCall: (api) => api.messages.threadFromMessageId(params.messageId),
		allowedErrors: 'NOT_FOUND',
	});
	if (!data) {
		return notFound();
	}
	return (
		<MessageResultPage
			messages={data.messages}
			channel={data.parentChannel}
			server={data.server}
			requestedId={params.messageId}
			relatedPosts={data.recommendedPosts}
			thread={data.thread ?? undefined}
		/>
	);
}
