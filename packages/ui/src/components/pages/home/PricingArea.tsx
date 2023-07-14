import { CheckIcon, RocketLaunchIcon } from '@heroicons/react/24/outline';
import { WAITLIST_URL } from '@answeroverflow/constants/src/links';
import { LinkButton, Heading, GetStarted } from '~ui/components/primitives';
import { trackEvent } from '@answeroverflow/hooks';
import { cn } from '~ui/utils/styling';
const pricing = {
	tiers: [
		{
			title: 'Roadmap',
			description: 'Tools to scale your community support',
			features: [
				{
					name: 'Index content into Google on answeroverflow.com',
					implemented: true,
				},
				{
					name: 'Marking questions as solved',
					implemented: true,
				},
				{
					name: 'User account management',
					implemented: true,
				},
				{
					name: 'Host on your own domain*',
					implemented: true,
				},
				{
					name: 'AI Question Answers',
					implemented: false,
				},
				{
					name: 'Advanced analytics',
					implemented: false,
				},
				{
					name: 'Question validation forms',
					implemented: false,
				},
			],
			cta: (
				<LinkButton
					href={WAITLIST_URL}
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
		<div className={cn('w-full', props.className)} id="roadmap">
			<Heading.H2 className="text-center ">
				{"And we're"} just getting started
			</Heading.H2>
			<div className="flex w-full items-center justify-center py-2">
				<Heading.H3 className="pt-0 text-center  text-lg lg:w-1/2">
					Add to your server and sign up to be notified as new features are
					released
				</Heading.H3>
			</div>
			<div className="flex w-full items-center justify-center pb-8 pt-4">
				<GetStarted location="Pricing" variant={'outline'}>
					Add to server
				</GetStarted>
			</div>

			{/* Tiers */}
			<div className="flex w-full justify-center">
				{pricing.tiers.map((tier) => (
					<div
						key={tier.title}
						className={cn(
							'relative flex w-full max-w-xl flex-col rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-700 dark:bg-ao-black',
							tier.mostPopular
								? 'shadow-xl shadow-ao-blue/[.5] lg:shadow-2xl'
								: '',
						)}
					>
						<div className="flex w-full flex-1 flex-col items-center justify-center text-center">
							<Heading.H3 className="font-semibold">{tier.title}</Heading.H3>

							<p className="text-neutral-600 dark:text-neutral-300">
								{tier.description}
							</p>

							<div className="flex flex-col gap-4 py-2 sm:flex-row">
								<div className="flex flex-row font-semibold text-neutral-600 dark:text-neutral-300">
									<CheckIcon
										className={cn(
											'h-6 w-6 shrink-0 text-green-800 dark:text-green-400',
										)}
										aria-hidden="true"
									/>
									<label className="ml-3 text-green-800 dark:text-green-400">
										Implemented
									</label>
								</div>
								<div className="flex flex-row font-semibold text-neutral-600 dark:text-neutral-300">
									<RocketLaunchIcon
										className={cn('h-6 w-6 shrink-0 text-ao-blue')}
										aria-hidden="true"
									/>
									<label className="ml-3 text-gray-600 dark:text-gray-300">
										Coming Soon
									</label>
								</div>
							</div>

							{/* Feature list */}
							<ul role="list" className="my-6 space-y-4 text-left">
								{tier.features.map((feature) => (
									<li key={feature.name} className="flex">
										{feature.implemented ? (
											<CheckIcon
												className={cn(
													'h-6 w-6 shrink-0 text-green-800 dark:text-green-400',
												)}
												aria-hidden="true"
											/>
										) : (
											<RocketLaunchIcon
												className={cn('h-6 w-6 shrink-0 text-ao-blue')}
												aria-hidden="true"
											/>
										)}

										<span
											className={cn(
												'ml-3',
												feature.implemented
													? 'text-green-800 dark:text-green-400 '
													: 'text-gray-600 dark:text-gray-300',
											)}
										>
											{feature.name}
										</span>
									</li>
								))}
							</ul>
						</div>
						<div className="flex w-full items-center justify-center">
							{tier.cta}
						</div>
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
