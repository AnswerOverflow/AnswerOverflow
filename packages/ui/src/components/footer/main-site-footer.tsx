"use client";

import { DiscordIcon, GitHubIcon } from "../../icons";
import { getBaseUrl } from "../../utils/links";
import { Link } from "../link";
import { ThemeSwitcher } from "../theme-switcher";

type SocialItem = {
	name: string;
	href: string;
	icon: (props: React.SVGProps<SVGSVGElement>) => React.ReactElement;
};

interface NavigationData {
	main: {
		category: {
			name: string;
			data: {
				name: string;
				href: string;
			}[];
		};
	}[];
	social: SocialItem[];
}

const getNavigation = (baseUrl: string): NavigationData => ({
	main: [
		{
			category: {
				name: "Product",
				data: [
					{ name: "Pricing", href: `${baseUrl}/pricing` },
					{ name: "Docs", href: `${baseUrl}/docs` },
					{ name: "Communities", href: `${baseUrl}/browse` },
				],
			},
		},
		{
			category: {
				name: "Resources",
				data: [
					{ name: "About", href: `${baseUrl}/about` },
					{ name: "Blog", href: `${baseUrl}/blog` },
					{ name: "Changelog", href: `${baseUrl}/changelog` },
					{ name: "Contributors", href: `${baseUrl}/contributors` },
				],
			},
		},
		{
			category: {
				name: "Legal",
				data: [
					{ name: "Terms", href: `${baseUrl}/tos` },
					{ name: "Privacy", href: `${baseUrl}/privacy` },
					{ name: "Cookies", href: `${baseUrl}/cookies` },
					{ name: "EULA", href: `${baseUrl}/eula` },
				],
			},
		},
	],
	social: [
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
	],
});

export function MainSiteFooter() {
	const baseUrl = getBaseUrl();
	const navigation = getNavigation(baseUrl);
	return (
		<footer>
			<div className="mx-auto max-w-7xl overflow-hidden px-6 py-10 sm:py-14 lg:px-8">
				<nav
					className="-mb-6 columns-1 text-center sm:flex sm:columns-2 sm:justify-center sm:space-x-12"
					aria-label="Footer"
				>
					<div className="grid grid-cols-1 gap-12 sm:grid-cols-3 sm:gap-16">
						{navigation.main.map((category) => {
							return (
								<div
									key={`category-${category.category.name}`}
									className="flex flex-col"
								>
									<h2 className="font-header text-lg font-bold text-black dark:text-white">
										{category.category.name}
									</h2>
									{category.category.data.map((item) => {
										return (
											<Link
												href={item.href}
												key={`link-${item.name}-${item.href}`}
												className="my-1 font-body text-primary/75 hover:text-primary"
											>
												{item.name}
											</Link>
										);
									})}
								</div>
							);
						})}
					</div>
				</nav>
				<div className="mt-16 flex items-center justify-center space-x-10">
					{navigation.social.map((item) => (
						<Link
							key={item.name}
							href={item.href}
							className="text-gray-400 hover:text-gray-500 dark:text-neutral-300 dark:hover:text-neutral-600"
							target="_blank"
							referrerPolicy="no-referrer"
						>
							<span className="sr-only">{item.name}</span>
							<item.icon className="h-6 w-6" aria-hidden="true" />
						</Link>
					))}
					<ThemeSwitcher />
				</div>
				<p className="mt-10 text-center font-body text-xs leading-5 text-gray-500 dark:text-neutral-400">
					&copy; 2026 Hedgehog Software, LLC. All rights reserved.
				</p>
			</div>
		</footer>
	);
}
