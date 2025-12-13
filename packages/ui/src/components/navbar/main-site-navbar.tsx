"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AnswerOverflowLogo } from "../answer-overflow-logo";
import { useSession } from "../convex-client-provider";
import { Input } from "../input";
import { Link } from "../link";
import { LinkButton } from "../link-button";
import { NavbarBase } from "./navbar-base";
import { UserSection } from "./user-section";

export function MainSiteNavbar() {
	const router = useRouter();
	const { data: session } = useSession({ allowAnonymous: false });
	const [searchQuery, setSearchQuery] = useState("");

	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault();
		if (searchQuery.trim()) {
			router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
		}
	};

	const searchBar = (
		<form onSubmit={handleSearch} className="w-full">
			<Input
				type="search"
				value={searchQuery}
				onChange={(e) => setSearchQuery(e.target.value)}
				placeholder="Search Discord messages..."
				className="w-full"
			/>
		</form>
	);

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
				className="flex items-center justify-center 2xl:hidden"
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

	return (
		<NavbarBase
			leftContent={leftContent}
			centerContent={searchBar}
			rightContent={rightContent}
		/>
	);
}
