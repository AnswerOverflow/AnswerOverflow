"use client";

import { Search } from "lucide-react";
import { AnswerOverflowLogo } from "../answer-overflow-logo";
import { useSession } from "../convex-client-provider";
import { Link } from "../link";
import { LinkButton } from "../link-button";
import { NavbarBase } from "./navbar-base";
import { UserSection } from "./user-section";

export function MainSiteNavbar() {
	const { data: session } = useSession({ allowAnonymous: false });

	const leftContent = (
		<Link
			href="/"
			className="text-foreground hover:text-foreground no-underline hover:no-underline"
		>
			<AnswerOverflowLogo width={180} />
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
			{!session?.user && (
				<LinkButton
					className="hidden md:block"
					variant="default"
					href="/dashboard"
				>
					Get Started
				</LinkButton>
			)}
			<UserSection showSignIn={true} />
		</>
	);

	return <NavbarBase leftContent={leftContent} rightContent={rightContent} />;
}
