"use client";

import type { Server } from "@packages/database/convex/schema";
import { Github, Search } from "lucide-react";
import type * as React from "react";
import { cn } from "../../lib/utils";
import { Link } from "../link";
import { LinkButton } from "../link-button";
import { ServerIcon } from "../server-icon";

import { UserSection } from "./user-section";
export interface NavbarProps {
	logo?: React.ReactNode;
	server?: Pick<Server, "discordId" | "name" | "icon"> | null;
	homeHref?: string;
	hideIcon?: boolean;
	showSearch?: boolean;
	searchHref?: string;
	showGitHub?: boolean;
	githubHref?: string;
	showGetStarted?: boolean;
	getStartedProps?: React.ComponentProps<typeof LinkButton>;
	searchBar?: React.ReactNode;
}

export function Navbar({
	logo,
	server,
	homeHref = "/",
	hideIcon = false,
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
						<LinkButton
							className={cn("hidden md:block", getStartedProps.className)}
							variant={getStartedProps.variant ?? "default"}
							{...getStartedProps}
						>
							Get Started
						</LinkButton>
					)}
					<UserSection />
				</div>
			</nav>
		</header>
	);
}
