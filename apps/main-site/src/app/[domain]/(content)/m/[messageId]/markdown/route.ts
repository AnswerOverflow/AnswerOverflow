import { Database } from "@packages/database/database";
import { decodeCursor } from "@packages/ui/utils/cursor";
import { parseSnowflakeId } from "@packages/ui/utils/snowflake";
import { Effect, Option } from "effect";
import { notFound, redirect } from "next/navigation";
import {
	fetchMessagePageReplies,
	type MessagePageReplies,
} from "../../../../../../components/message-page-loader";
import {
	buildMessageMarkdown,
	createMarkdownResponse,
} from "../../../../../../lib/message-markdown";
import { runtime } from "../../../../../../lib/runtime";

type RouteParams = {
	params: Promise<{ domain: string; messageId: string }>;
};

export async function GET(
	request: Request,
	{ params }: RouteParams,
): Promise<Response> {
	const { domain: encodedDomain, messageId } = await params;
	const domain = decodeURIComponent(encodedDomain);

	const parsed = parseSnowflakeId(messageId);
	if (Option.isNone(parsed)) {
		notFound();
	}
	if (parsed.value.wasCleaned) {
		redirect(`/m/${parsed.value.cleaned}.md`);
	}

	const url = new URL(request.url);
	const cursorParam = url.searchParams.get("cursor");
	const cursor = cursorParam ? decodeCursor(cursorParam) : null;

	const [tenantData, headerData] = await Effect.gen(function* () {
		const database = yield* Database;
		const tenant = yield* database.public.servers.getServerByDomain({
			domain,
		});
		const header = yield* database.public.messages.getMessagePageHeaderData({
			messageId: parsed.value.id,
		});
		return [tenant, header] as const;
	}).pipe(runtime.runPromise);

	if (!tenantData?.server || !headerData) {
		notFound();
	}

	if (headerData.server.discordId !== tenantData.server.discordId) {
		notFound();
	}

	const hasThread = headerData.thread !== null;
	const rootMessageDeleted = !headerData.firstMessage;

	if (rootMessageDeleted && !hasThread) {
		notFound();
	}

	const canonicalId = headerData.canonicalId.toString();

	if (canonicalId !== messageId) {
		const redirectUrl = cursor
			? `/m/${canonicalId}.md?cursor=${cursorParam}`
			: `/m/${canonicalId}.md`;
		redirect(redirectUrl);
	}

	const queryChannelId = headerData.threadId ?? headerData.channelId;
	const afterMessageId =
		headerData.threadId ?? headerData.firstMessage?.message.id;

	let replies: MessagePageReplies = {
		page: [],
		isDone: true,
		continueCursor: "",
	};

	if (afterMessageId) {
		replies = await fetchMessagePageReplies({
			channelId: queryChannelId,
			after: afterMessageId,
			cursor,
		});
	}

	const markdown = buildMessageMarkdown({
		headerData,
		replies,
		messageId: canonicalId,
	});

	return createMarkdownResponse(markdown);
}
