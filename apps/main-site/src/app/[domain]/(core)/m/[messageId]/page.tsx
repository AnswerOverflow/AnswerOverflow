import { MessageResultPage } from '@answeroverflow/ui/src/pages/MessageResultPage';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { makeMessageResultPage } from '@answeroverflow/db';
type Props = {
	params: { messageId: string };
};
export const revalidate = 86400;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const data = await makeMessageResultPage(params.messageId, []);

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
	const data = await makeMessageResultPage(params.messageId, []);

	if (!data) {
		return notFound();
	}
	return (
		<MessageResultPage
			messages={data.messages}
			channel={data.parentChannel}
			server={data.server}
			isUserInServer={'not_in_server'}
			tenant={data.server}
			requestedId={params.messageId}
			relatedPosts={data.recommendedPosts}
			thread={data.thread ?? undefined}
		/>
	);
}
