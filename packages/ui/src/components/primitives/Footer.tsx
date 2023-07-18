import Link from 'next/link';
// TODO: Storybook breaks when importing from the root of @answeroverflow/constants - figure out why
import {
	DISCORD_LINK,
	GITHUB_LINK,
	TWITTER_LINK,
} from '@answeroverflow/constants/src/links';
import { AnswerOverflowLogo, DiscordIcon, GitHubIcon, Heading } from './base';
import { useTenantContext } from '@answeroverflow/hooks';

type SocialItem = {
	name: string;
	href: string;
	icon: any;
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

const navigation: NavigationData = {
	main: [
		{
			category: {
				name: 'Legal',
				data: [
					{ name: 'Terms', href: 'https://www.answeroverflow.com/tos' },
					{ name: 'Privacy', href: 'https://www.answeroverflow.com/privacy' },
					{ name: 'Cookies', href: 'https://www.answeroverflow.com/cookies' },
					{ name: 'EULA', href: 'https://www.answeroverflow.com/eula' },
				],
			},
		},
		{
			category: {
				name: 'About',
				data: [
					{ name: 'Docs', href: 'https://docs.answeroverflow.com' },
					{ name: 'Pricing', href: 'https://www.answeroverflow.com/pricing' },
					{
						name: 'Contributors',
						href: 'https://www.answeroverflow.com/contributors',
					},
					{
						name: 'Communities',
						href: 'https://www.answeroverflow.com/browse',
					},
				],
			},
		},
	],
	social: [
		{
			name: 'Twitter',
			href: TWITTER_LINK,
			icon: (props: any) => (
				<svg fill="currentColor" viewBox="0 0 24 24" {...props}>
					<path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
				</svg>
			),
		},
		{
			name: 'GitHub',
			href: GITHUB_LINK,
			icon: (props: any) => <GitHubIcon {...props} />,
		},
		{
			name: 'Discord',
			href: DISCORD_LINK,
			icon: (props: any) => <DiscordIcon {...props} />,
		},
	],
};

const MainSiteFooter = () => (
	<div className="mx-auto max-w-7xl overflow-hidden px-6 py-10 sm:py-14 lg:px-8">
		<nav
			className="-mb-6 columns-1 text-center sm:flex sm:columns-2  sm:justify-center sm:space-x-12"
			aria-label="Footer"
		>
			<div className="grid grid-cols-1 gap-12 md:grid-cols-2 md:gap-24">
				{navigation.main.map((category) => {
					return (
						<div
							key={`category-${category.category.name}`}
							className="flex flex-col"
						>
							<Heading.H2 className="font-header text-lg font-bold text-black dark:text-white">
								{category.category.name}
							</Heading.H2>
							{category.category.data.map((item) => {
								return (
									<Link
										href={item.href}
										key={`link-${item.name}-${item.href}`}
										className="font-body leading-6 text-gray-600 hover:text-gray-900 dark:text-neutral-400 dark:hover:text-neutral-200"
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
		<div className="mt-16 flex justify-center space-x-10">
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
		</div>
		<p className="mt-10 text-center font-body text-xs leading-5 text-gray-500 dark:text-neutral-400">
			&copy; 2023 Hedgehog Software, LLC. All rights reserved.
		</p>
	</div>
);

const PoweredByAnswerOverflowFooter = () => (
	<div className="flex flex-col items-center justify-center">
		<Link
			href="https://www.answeroverflow.com"
			className="flex flex-col items-center justify-center gap-2 fill-black stroke-black py-8 font-bold text-ao-black  hover:fill-blue-500 hover:stroke-blue-500 hover:text-ao-blue dark:fill-white dark:stroke-white dark:text-ao-white hover:dark:fill-blue-500 hover:dark:stroke-blue-500 hover:dark:text-ao-blue"
		>
			<span>Powered by</span>
			<AnswerOverflowLogo className="mx-auto w-36 fill-inherit stroke-inherit dark:fill-inherit dark:stroke-inherit" />
		</Link>
	</div>
);

export function Footer() {
	const { isOnTenantSite } = useTenantContext();

	return (
		<footer>
			{isOnTenantSite ? <PoweredByAnswerOverflowFooter /> : <MainSiteFooter />}
		</footer>
	);
}
