"use client";

import { Search } from "lucide-react";
import { AnswerOverflowLogo } from "../answer-overflow-logo";
import { useSession } from "../convex-client-provider";
import { Link } from "../link";
import { LinkButton } from "../link-button";
import { FeedbackButton } from "./feedback-button";
import { GitHubStarButton } from "./github-star-button";
import { NavbarBase } from "./navbar-base";
import { UserSection } from "./user-section";

export function MainSiteNavbar({
	githubStars,
}: {
	githubStars?: number | null;
}) {
	const { data: session } = useSession({ allowAnonymous: false });

	const leftContent = (
		<Link
			href="/"
			className="text-foreground hover:text-foreground no-underline hover:no-underline"
		>
			<AnswerOverflowLogo width={160} />
		</Link>
	);

	const rightContent = (
		<>
			<LinkButton
				variant="ghost"
				size="icon"
				href="/search"
				className="flex items-center justify-center"
			>
				<Search className="h-5 w-5" />
				<span className="sr-only">Search</span>
			</LinkButton>
			<div className="hidden md:block">
				<GitHubStarButton starCount={githubStars ?? null} />
			</div>
			<div className="hidden md:block">
				<FeedbackButton />
			</div>
			{!session?.user && (
				<LinkButton
					className="hidden md:block"
					variant="default"
					href="/dashboard"
				>
					Setup for Free
				</LinkButton>
			)}
			<UserSection showSignIn={true} />
		</>
	);

	return <NavbarBase leftContent={leftContent} rightContent={rightContent} />;
}
