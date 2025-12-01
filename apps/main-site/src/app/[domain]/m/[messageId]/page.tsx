import { Database } from "@packages/database/database";
import { Effect } from "effect";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { runtime } from "../../../../lib/runtime";
import { MessagePage } from "../../../../components/message-page";

type Props = {
	params: Promise<{ domain: string; messageId: string }>;
};

function getThreadIdOfMessage(message: {
	channelId: bigint;
	childThreadId?: bigint | null;
	parentChannelId?: bigint | null;
}): bigint | null {
	if (message.childThreadId) {
		return message.childThreadId;
	}
	if (message.parentChannelId) {
		return message.channelId;
	}
	return null;
}

export async function generateMetadata(props: Props): Promise<Metadata> {
	const params = await props.params;

	const pageData = await Effect.gen(function* () {
		const database = yield* Database;
		const liveData = yield* database.private.messages.getMessagePageData({
			messageId: BigInt(params.messageId),
		});
		return liveData;
	}).pipe(runtime.runPromise);

	if (!pageData) {
		return {};
	}

	const firstMessage = pageData.messages.at(0);
	const title =
		pageData.thread?.name ??
		firstMessage?.message.content?.slice(0, 100) ??
		pageData.channel.name;
	const description =
		firstMessage?.message.content && firstMessage.message.content.length > 0
			? firstMessage.message.content
			: `Questions related to ${pageData.channel.name} in ${pageData.server.name}`;

	return {
		title: `${title} - ${pageData.server.name}`,
		description,
		openGraph: {
			images: [`/og/post?id=${params.messageId}`],
			title: `${title} - ${pageData.server.name}`,
			description,
		},
		alternates: {
			canonical: `/m/${pageData.thread?.id.toString() ?? params.messageId}`,
		},
	};
}

export default async function TenantMessagePage(props: Props) {
	const params = await props.params;
	const domain = decodeURIComponent(params.domain);

	const tenantData = await Effect.gen(function* () {
		const database = yield* Database;
		const tenant = yield* database.private.servers.getServerByDomain({
			domain,
		});
		return tenant;
	}).pipe(runtime.runPromise);

	if (!tenantData?.server) {
		return notFound();
	}

	const message = await Effect.gen(function* () {
		const database = yield* Database;
		return yield* database.private.messages.getMessageById({
			id: BigInt(params.messageId),
		});
	}).pipe(runtime.runPromise);

	if (!message) {
		return notFound();
	}

	if (message.serverId !== tenantData.server.discordId) {
		return notFound();
	}

	const threadId = getThreadIdOfMessage(message);
	if (threadId && threadId.toString() !== params.messageId) {
		redirect(`/m/${threadId.toString()}`);
	}

	const pageData = await Effect.gen(function* () {
		const database = yield* Database;
		const liveData = yield* database.private.messages.getMessagePageData({
			messageId: BigInt(params.messageId),
		});
		return liveData;
	}).pipe(runtime.runPromise);

	if (!pageData) {
		return notFound();
	}

	return <MessagePage data={pageData} />;
}
