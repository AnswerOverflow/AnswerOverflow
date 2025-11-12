"use client";

import type { Server } from "@packages/database/convex/schema";
import { Github, Search } from "lucide-react";
import type * as React from "react";
import { cn } from "../../lib/utils";
import { Link } from "../link";
import { LinkButton } from "../link-button";
import { ServerIcon } from "../server-icon";
import { ThemeSwitcher } from "../theme-switcher";
import { UserSection, type UserSectionProps } from "./user-section";
export interface NavbarProps {
	/** Logo or brand name to display on the left */
	logo?: React.ReactNode;
	/** Server/tenant information to display instead of logo */
	server?: Pick<Server, "discordId" | "name" | "icon"> | null;
	/** Link to navigate to when clicking logo/server */
	homeHref?: string;
	/** Hide the logo/server icon */
	hideIcon?: boolean;
	/** User section props */
	userSection?: UserSectionProps;
	/** Show search button (mobile) */
	showSearch?: boolean;
	/** Search href */
	searchHref?: string;
	/** Show GitHub link */
	showGitHub?: boolean;
	/** GitHub link URL */
	githubHref?: string;
	/** Show "Get Started" button */
	showGetStarted?: boolean;
	/** Get Started button props */
	getStartedProps?: React.ComponentProps<typeof LinkButton>;
	/** Custom search bar component (centered, desktop only) */
	searchBar?: React.ReactNode;
}

export function Navbar({
	logo,
	server,
	homeHref = "/",
	hideIcon = false,
	userSection,
	showSearch = true,
	searchHref = "/search",
	showGitHub = false,
	githubHref = "https://github.com",
	showGetStarted = false,
	getStartedProps,
	searchBar,
}: NavbarProps) {
	return (
		<header className="fixed left-0 top-0 z-[1000] h-16 w-full bg-background px-4">
			<nav className="relative z-10 flex size-full flex-1 items-center justify-between border-b-2 pb-2 md:py-2">
				<div>
					<Link
						href={homeHref}
						className={cn(
							hideIcon ? "hidden" : "",
							"text-foreground hover:text-foreground no-underline hover:no-underline",
						)}
					>
						{server ? (
							<div className="flex items-center space-x-2">
								<ServerIcon server={server} size={48} />
								<span className="font-semibold">{server.name}</span>
							</div>
						) : (
							logo || (
								<div className="w-32 md:w-40">
									<span className="text-xl font-bold">Logo</span>
								</div>
							)
						)}
					</Link>
				</div>
				{/* Align search bar to absolute middle horizontally, top vertically */}
				{searchBar && (
					<div className="absolute left-1/2 top-1/2 hidden w-full max-w-[620px] -translate-x-1/2 -translate-y-1/2 2xl:block">
						{searchBar}
					</div>
				)}
				<div className="flex items-center gap-2">
					<ThemeSwitcher />
					{showSearch && (
						<LinkButton
							variant="ghost"
							size="icon"
							href={searchHref}
							className="flex items-center justify-center 2xl:hidden"
						>
							<Search className="h-5 w-5" />
							<span className="sr-only">Search</span>
						</LinkButton>
					)}
					{showGitHub && (
						<LinkButton
							className="hidden md:flex"
							variant="ghost"
							size="icon"
							href={githubHref}
							target="_blank"
							rel="noopener noreferrer"
						>
							<Github className="h-5 w-5" />
							<span className="sr-only">GitHub</span>
						</LinkButton>
					)}
					{showGetStarted && getStartedProps && (
						<LinkButton className="hidden md:block" {...getStartedProps}>
							Get Started
						</LinkButton>
					)}
					{userSection && <UserSection {...userSection} />}
				</div>
			</nav>
		</header>
	);
}
