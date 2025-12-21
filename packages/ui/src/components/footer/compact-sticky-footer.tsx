"use client";

import { ChevronUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { DiscordIcon, GitHubIcon } from "../../icons";
import { cn } from "../../lib/utils";
import { getBaseUrl } from "../../utils/links";
import { Link } from "../link";
import { ThemeSwitcher } from "../theme-switcher";

const getQuickLinks = (baseUrl: string) => [
	{ name: "Communities", href: `${baseUrl}/browse` },
	{ name: "Docs", href: `${baseUrl}/docs/overview`, prefetch: false },
	{ name: "About", href: `${baseUrl}/about` },
	{ name: "Terms", href: `${baseUrl}/tos` },
	{ name: "Privacy", href: `${baseUrl}/privacy` },
];

const getSocialLinks = () => [
	{
		name: "Twitter",
		href: "https://www.twitter.com/answeroverflow",
		icon: (props: React.SVGProps<SVGSVGElement>) => (
			<svg fill="currentColor" viewBox="0 0 24 24" {...props}>
				<path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
			</svg>
		),
	},
	{
		name: "GitHub",
		href: "https://www.github.com/answeroverflow/answeroverflow",
		icon: (props: React.SVGProps<SVGSVGElement>) => <GitHubIcon {...props} />,
	},
	{
		name: "Discord",
		href: "https://discord.answeroverflow.com",
		icon: (props: React.SVGProps<SVGSVGElement>) => (
			<DiscordIcon {...props} color="blurple" />
		),
	},
];

export function CompactStickyFooter({
	disableHideOnScroll = false,
}: {
	disableHideOnScroll?: boolean;
}) {
	const [isExpanded, setIsExpanded] = useState(false);
	const [isVisible, setIsVisible] = useState(true);
	const lastScrollY = useRef(0);
	const baseUrl = getBaseUrl();
	const quickLinks = getQuickLinks(baseUrl);
	const socialLinks = getSocialLinks();

	useEffect(() => {
		if (disableHideOnScroll) return;

		const handleScroll = () => {
			const currentScrollY = window.scrollY;
			const isScrollingDown = currentScrollY > lastScrollY.current;
			const isScrollingUp = currentScrollY < lastScrollY.current;

			if (isScrollingDown && currentScrollY > 100) {
				setIsVisible(false);
				setIsExpanded(false);
			} else if (isScrollingUp) {
				setIsVisible(true);
			}

			lastScrollY.current = currentScrollY;
		};

		window.addEventListener("scroll", handleScroll, { passive: true });
		return () => {
			window.removeEventListener("scroll", handleScroll);
		};
	}, [disableHideOnScroll]);

	return (
		<div
			className={cn(
				"hidden sm:block fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur-sm transition-transform",
				isExpanded ? "shadow-lg" : "",
				isVisible
					? "translate-y-0 duration-500"
					: "translate-y-full duration-200",
			)}
		>
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<div
					onClick={() => setIsExpanded(!isExpanded)}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === " ") {
							e.preventDefault();
							setIsExpanded(!isExpanded);
						}
					}}
					role="button"
					tabIndex={0}
					className="flex h-12 w-full items-center justify-between cursor-pointer"
					aria-label={isExpanded ? "Collapse footer" : "Expand footer"}
					aria-expanded={isExpanded}
				>
					<div className="flex items-center gap-4">
						<p className="text-xs text-muted-foreground hidden sm:block">
							© 2026 Hedgehog Software, LLC
						</p>

						<div
							className="flex items-center gap-3"
							onClick={(e) => e.stopPropagation()}
							onKeyDown={(e) => e.stopPropagation()}
						>
							{socialLinks.map((item) => (
								<Link
									key={item.name}
									href={item.href}
									className="text-muted-foreground hover:text-foreground transition-colors"
									target="_blank"
									referrerPolicy="no-referrer"
								>
									<span className="sr-only">{item.name}</span>
									<item.icon className="h-4 w-4" aria-hidden="true" />
								</Link>
							))}
						</div>
					</div>

					<div className="flex items-center gap-4">
						<div
							onClick={(e) => e.stopPropagation()}
							onKeyDown={(e) => e.stopPropagation()}
						>
							<ThemeSwitcher />
						</div>

						<div className="flex items-center gap-1 text-xs text-muted-foreground">
							<span className="hidden sm:inline">
								{isExpanded ? "Less" : "More"}
							</span>
							<ChevronUp
								className={cn(
									"h-4 w-4 transition-transform duration-200",
									isExpanded ? "rotate-180" : "",
								)}
							/>
						</div>
					</div>
				</div>

				<div
					className={cn(
						"grid transition-all duration-300 ease-in-out",
						isExpanded
							? "grid-rows-[1fr] opacity-100"
							: "grid-rows-[0fr] opacity-0",
					)}
				>
					<div className="overflow-hidden">
						<div className="py-4 border-t">
							<div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
								{quickLinks.map((link) => (
									<Link
										key={link.name}
										prefetch={link.prefetch}
										href={link.href}
										className="text-sm text-muted-foreground hover:text-foreground transition-colors"
									>
										{link.name}
									</Link>
								))}
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
