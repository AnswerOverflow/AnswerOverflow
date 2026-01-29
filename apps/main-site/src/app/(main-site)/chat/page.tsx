import { ChatPageHandler } from "@/components/chat/chat-page-handler";

type Props = {
	searchParams: Promise<{ server?: string; q?: string }>;
};

export default async function ChatPage({ searchParams }: Props) {
	const params = await searchParams;

	return (
		<ChatPageHandler serverDiscordId={params.server} initialQuery={params.q} />
	);
}
