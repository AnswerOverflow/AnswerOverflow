import { makeMessageResultPage } from '@answeroverflow/core/pages';
import { MessageResultPage } from '@answeroverflow/ui/pages/MessageResultPage';
import { getServerCustomUrl } from '@answeroverflow/ui/utils/server';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

type Props = {
	params: Promise<{ messageId: string }>;
	searchParams?: Promise<{ showAiChat?: boolean }>;
};

export const revalidate = 3600;
export const dynamic = 'force-static';
export async function generateMetadata(props: Props): Promise<Metadata> {
	const params = await props.params;
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

export default async function MessageResult(props: Props) {
	const searchParams = await props.searchParams;
	const params = await props.params;
	const data = await makeMessageResultPage(params.messageId, []);
	if (!data) {
		return notFound();
	}
	if (data.server.customDomain) {
		const customUrl = getServerCustomUrl(data.server, `/m/${params.messageId}`);
		if (customUrl) {
			return redirect(customUrl);
		}
	}
	return (
		<MessageResultPage
			messages={data.messages}
			showAIChat={searchParams?.showAiChat}
			channel={data.parentChannel}
			server={data.server}
			tenant={undefined}
			requestedId={params.messageId}
			relatedPosts={data.recommendedPosts}
			isUserInServer={'not_in_server'}
			thread={data.thread ?? undefined}
		/>
	);
}
