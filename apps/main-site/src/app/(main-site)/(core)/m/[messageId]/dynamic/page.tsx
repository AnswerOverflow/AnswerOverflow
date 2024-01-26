import { MessageResultPage } from '@answeroverflow/ui/src/components/pages/MessageResultPage';
import { notFound, redirect } from 'next/navigation';
import { callAPI } from '@answeroverflow/ui/src/utils/trpc';
import type { Metadata } from 'next';
type Props = {
	params: { messageId: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const data = await callAPI({
		apiCall: (api) => api.messages.threadFromMessageId(params.messageId),
		allowedErrors: 'NOT_FOUND',
	});

	if (!data) return {};
	const firstMessage = data.messages.at(0);
	const channelName = data.thread?.name ?? data.parentChannel.name;
	const server = data.server;
	const description =
		firstMessage && firstMessage.content?.length > 0
			? firstMessage.content
			: `Questions related to ${channelName} in ${server.name}`;
	const title = data.thread?.name ?? firstMessage?.content ?? channelName;
	return {
		title: `${title} - ${server.name}`,
		description,
		openGraph: {
			images: [`/og/post?id=${params.messageId}`],
			title: `${title} - ${server.name}`,
			description,
		},
		alternates: {
			canonical: `/m/${data.thread?.id ?? params.messageId}`,
		},
	};
}

export default async function MessageResult({ params }: Props) {
	const data = await callAPI({
		apiCall: (api) => api.messages.threadFromMessageId(params.messageId),
		allowedErrors: 'NOT_FOUND',
	});
	if (!data) {
		return notFound();
	}
	if (data.server.customDomain) {
		return redirect(
			`https://${data.server.customDomain}/m/${params.messageId}`,
		);
	}
	return (
		<MessageResultPage
			messages={data.messages}
			attachments={data.attachments}
			channel={data.parentChannel}
			server={data.server}
			tenant={undefined}
			requestedId={params.messageId}
			relatedPosts={data.recommendedPosts}
			thread={data.thread ?? undefined}
		/>
	);
}
