import { makeMainSiteLink } from '@answeroverflow/constants';
import { sharedEnvs } from '@answeroverflow/env/shared';
import { makeMessageResultPage } from '@answeroverflow/db';
import { notFound, permanentRedirect, redirect } from 'next/navigation';
import MessageResultPage from '@answeroverflow/ui/src/components/pages/MessageResultPage';

export const revalidate = 3600; // revalidate at most every hour

export default async function TenantResultPage(props: {
	params: { messageId: string };
}) {
	const data = await makeMessageResultPage(props.params.messageId, []);
	if (!data) {
		return notFound();
	}
	if (!data.server.customDomain) {
		if (sharedEnvs.NODE_ENV === 'production') {
			return permanentRedirect(
				makeMainSiteLink(`/m/${props.params.messageId}`),
			);
		} else {
			return redirect(makeMainSiteLink(`/m/${props.params.messageId}`));
		}
	}
	return (
		<MessageResultPage
			messages={data.messages}
			channel={data.parentChannel}
			server={data.server}
			requestedId={props.params.messageId}
			relatedPosts={data.recommendedPosts}
			thread={data.thread ?? undefined}
		/>
	);
}
