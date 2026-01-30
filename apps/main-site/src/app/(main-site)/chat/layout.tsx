import { SignInIfAnon } from "@packages/ui/components/sign-in-if-anon";
import { Suspense } from "react";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { FeaturedReposProvider } from "@/components/chat/featured-repos-provider";
import { FeaturedServersProvider } from "@/components/chat/featured-servers-provider";
import { getFeaturedServers } from "@/lib/discord-servers";
import { getFeaturedRepos } from "@/lib/github";

export default async function ChatLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const [featuredRepos, featuredServers] = await Promise.all([
		getFeaturedRepos(),
		getFeaturedServers(),
	]);
	return (
		<FeaturedReposProvider repos={featuredRepos}>
			<FeaturedServersProvider servers={featuredServers}>
				<SignInIfAnon />
				<Suspense>
					<ChatSidebar>{children}</ChatSidebar>
				</Suspense>
			</FeaturedServersProvider>
		</FeaturedReposProvider>
	);
}
