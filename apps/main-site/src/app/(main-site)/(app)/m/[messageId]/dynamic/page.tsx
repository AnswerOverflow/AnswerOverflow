import { MessageResultPage } from '@answeroverflow/ui/pages/MessageResultPage';
import { fetchIsUserInServer } from '@answeroverflow/ui/utils/fetch-is-user-in-server';
import { getServerCustomUrl } from '@answeroverflow/ui/utils/server';
import { callAPI } from '@answeroverflow/ui/utils/trpc';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

type Props = {
	params: Promise<{ messageId: string }>;
	searchParams?: Promise<{ showAiChat?: boolean }>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
	const params = await props.params;
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
export default async function MessageResult(props: Props) {
	const searchParams = await props.searchParams;
	const params = await props.params;
	const data = await callAPI({
		apiCall: (api) => api.messages.threadFromMessageId(params.messageId),
		allowedErrors: 'NOT_FOUND',
	});
	if (!data) {
		return notFound();
	}
	if (data.server.customDomain) {
		const customUrl = getServerCustomUrl(data.server, `/m/${params.messageId}`);
		if (customUrl) {
			return redirect(customUrl);
		}
	}
	const isInServer = await fetchIsUserInServer(data.server.id);
	return (
		<MessageResultPage
			messages={data.messages}
			showAIChat={searchParams?.showAiChat}
			channel={data.parentChannel}
			server={data.server}
			tenant={undefined}
			isUserInServer={isInServer}
			requestedId={params.messageId}
			relatedPosts={data.recommendedPosts}
			thread={data.thread ?? undefined}
		/>
	);
}
