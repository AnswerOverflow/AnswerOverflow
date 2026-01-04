import { SignInIfAnon } from "@packages/ui/components/sign-in-if-anon";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { FeaturedReposProvider } from "@/components/chat/featured-repos-provider";
import { getFeaturedRepos } from "@/lib/github";

export default async function ChatLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const featuredRepos = await getFeaturedRepos();
	return (
		<FeaturedReposProvider repos={featuredRepos}>
			<SignInIfAnon />
			<ChatSidebar>{children}</ChatSidebar>
		</FeaturedReposProvider>
	);
}
