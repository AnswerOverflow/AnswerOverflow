import { decodeCursor } from "@packages/ui/utils/cursor";
import { parseSnowflakeId } from "@packages/ui/utils/snowflake";
import { Option } from "effect";
import { notFound, redirect } from "next/navigation";
import {
	fetchMessagePageHeaderData,
	fetchMessagePageReplies,
	type MessagePageReplies,
} from "../../../../../components/message-page-loader";
import {
	buildMessageMarkdown,
	createMarkdownResponse,
} from "../../../../../lib/message-markdown";

type RouteParams = {
	params: Promise<{ messageId: string }>;
};

export async function GET(
	request: Request,
	{ params }: RouteParams,
): Promise<Response> {
	const { messageId } = await params;

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

	const headerData = await fetchMessagePageHeaderData(parsed.value.id);

	if (!headerData) {
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
