import { CheckIcon } from '@heroicons/react/24/outline';
import { WAITLIST_URL } from '@answeroverflow/constants/src/links';
import {
	GetStarted,
	LinkButton,
	Heading,
} from '@answeroverflow/ui/src/components/primitives';
import { trackEvent } from '@answeroverflow/hooks';
import { cn } from '~ui/utils/styling';
const pricing = {
	tiers: [
		{
			title: 'Free',
			description: 'Great for smaller communities ',
			features: ['Hosting on answeroverflow.com', 'Basic analytics'],
			cta: (
				<GetStarted variant={'subtle'} className="w-full" location="Pricing" />
			),
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
				<LinkButton
					href={WAITLIST_URL}
					className="w-full"
					onMouseUp={() => {
						trackEvent('Join Waitlist Click', {
							'Button Location': 'Pricing Page',
						});
					}}
				>
					Join Waitlist
				</LinkButton>
			),
			mostPopular: true,
		},
	],
};

export const PricingArea = (props: { className?: string }) => {
	return (
		<div className={cn('w-full', props.className)}>
			<Heading.H2 className="text-center md:text-left">
				Make the most of your community
			</Heading.H2>
			<Heading.H3 className="pt-0 text-center text-lg md:w-3/4 md:text-left lg:w-1/2">
				Plans for communities of all sizes. Whether {"you're"} just getting
				started or managing thousands of members, we{"'"}ve got you covered.
			</Heading.H3>

			{/* Tiers */}
			<div className="mt-8 space-y-12 lg:grid lg:grid-cols-2 lg:gap-x-8 lg:space-y-0">
				{pricing.tiers.map((tier) => (
					<div
						key={tier.title}
						className={cn(
							'relative flex flex-col rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-700 dark:bg-ao-black',
							tier.mostPopular
								? 'shadow-xl shadow-ao-blue/[.5] lg:shadow-2xl'
								: '',
						)}
					>
						<div className="flex-1">
							<Heading.H3 className="font-semibold">{tier.title}</Heading.H3>

							<p className="text-neutral-600 dark:text-neutral-300">
								{tier.description}
							</p>

							{/* Feature list */}
							<ul role="list" className="my-6 space-y-4">
								{tier.features.map((feature) => (
									<li key={feature} className="flex">
										<CheckIcon
											className="h-6 w-6 shrink-0 text-ao-blue"
											aria-hidden="true"
										/>
										<span className="ml-3 text-gray-600 dark:text-gray-300">
											{feature}
										</span>
									</li>
								))}
							</ul>
						</div>
						{tier.cta}
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
};
