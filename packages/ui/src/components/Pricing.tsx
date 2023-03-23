import { CheckIcon } from '@heroicons/react/24/outline';
import { GetStarted } from './Callouts';
import { LinkButton } from './primitives';
import { Heading } from './primitives/Heading';
import { WAITLIST_URL } from '@answeroverflow/constants/src/links';
const pricing = {
	tiers: [
		{
			title: 'Free',
			description: 'Great for smaller communities ',
			features: ['Hosting on answeroverflow.com', 'Basic analytics'],
			cta: <GetStarted variant={'subtle'} className="w-full" />,
			mostPopular: false,
		},
		{
			title: 'Enterprise',
			description: 'Tools to scale your community support',
			features: [
				'Host on your own domain*',
				'Advanced analytics',
				'Premium Support',
				'AI Question Answers',
			],
			cta: (
				<LinkButton href={WAITLIST_URL} className="w-full">
					Join Waitlist
				</LinkButton>
			),
			mostPopular: true,
		},
	],
};

function classNames(...classes: string[]) {
	return classes.filter(Boolean).join(' ');
}

export function Pricing() {
	return (
		<div className="mx-auto max-w-7xl  py-24 px-6 lg:px-8">
			<Heading.H2 className="text-3xl font-bold tracking-tight sm:text-5xl sm:leading-none lg:text-6xl">
				Make the most of your community
			</Heading.H2>
			<p className="mt-6 max-w-2xl text-xl text-neutral-600 dark:text-neutral-200">
				Plan for communities of all sizes. Whether {"you're"} just getting
				started or managing thousands of members, we{"'"}ve got you covered.
			</p>

			{/* Tiers */}
			<div className="mt-24 space-y-12 lg:grid lg:grid-cols-2 lg:gap-x-8 lg:space-y-0">
				{pricing.tiers.map((tier) => (
					<div
						key={tier.title}
						className={classNames(
							'relative flex flex-col rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-700 dark:bg-ao-black',
							tier.mostPopular ? 'shadow-xl shadow-ao-yellow/[.5]' : '',
						)}
					>
						<div className="flex-1">
							<Heading.H3 className="text-xl font-semibold">
								{tier.title}
							</Heading.H3>

							<p className="mt-6 text-neutral-600 dark:text-neutral-300">
								{tier.description}
							</p>

							{/* Feature list */}
							<ul role="list" className="mt-6 space-y-6">
								{tier.features.map((feature) => (
									<li key={feature} className="flex">
										<CheckIcon
											className="h-6 w-6 shrink-0 text-indigo-500"
											aria-hidden="true"
										/>
										<span className="ml-3 text-gray-600 dark:text-gray-300">
											{feature}
										</span>
									</li>
								))}
							</ul>
						</div>
						<div className="w-full py-4">{tier.cta}</div>
					</div>
				))}
			</div>
			<div
				className="
        pt-10
        text-center
        text-neutral-600 dark:text-neutral-400"
			>
				*You can start hosting content on answeroverflow.com today and upgrade
				at any time, all of the existing content will be redirected to your own
				domain.
			</div>
		</div>
	);
}
