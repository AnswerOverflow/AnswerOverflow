import { ChatInterface } from "@/components/chat/chat-interface";

type ThreadPageProps = {
	params: Promise<{
		threadId: string;
	}>;
};

export default async function ThreadPage({ params }: ThreadPageProps) {
	const { threadId } = await params;
	return <ChatInterface key={threadId} threadId={threadId} />;
}
