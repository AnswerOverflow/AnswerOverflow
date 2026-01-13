import { ChatInterface } from "@/components/chat/chat-interface";

type RepoChatPageProps = {
	params: Promise<{
		domain: string;
		repo: string;
		path?: string[];
	}>;
};

export default async function RepoChatPage({ params }: RepoChatPageProps) {
	const { domain, repo, path } = await params;
	return (
		<ChatInterface
			initialRepo={{
				owner: domain,
				repo: repo,
				filePath: path?.join("/"),
			}}
		/>
	);
}
