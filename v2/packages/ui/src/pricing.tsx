'use client';
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from './ui/accordion';
import { Check } from 'lucide-react';
import { trackEvent } from '@answeroverflow/hooks/src/analytics/events';
import { toast } from 'react-toastify';
import React from 'react';
import { classNames } from './utils/utils';
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { BlueLink } from './ui/blue-link';

import { LinkButton } from './ui/link-button';
import { Heading } from './ui/heading';
import { IoBusiness } from 'react-icons/io5';
import { IoMdGlobe } from 'react-icons/io';
import { usePathname } from 'next/navigation';
const enterpriseFAQs: {
	question: React.ReactNode;
	answer: React.ReactNode;
}[] = [
	{
		question: 'What happens if I go over my page view limits?',
		answer: (
			<span>
				<b>Your site will stay active</b> while we will reach out to you to
				figure out a plan that works for you. If it is a one off burst of
				traffic, {"we'll"} keep you on the plan {"you're"} on. If it is a
				consistent increase in traffic, {"we'll"} ask you to upgrade to the next
				plan.
			</span>
		),
	},
	{
		question:
			'Do you have plans for non-profit / non-commercial open source use?',
		answer:
			"Our public platform is perfect for non-profit / non-commercial open source use. If for some reason our public platform doesn't work for you, please reach out to us and we'll see what we can do.",
	},
	{
		question: 'How are page views calculated?',
		answer:
			'Page views are based off of total views, not unique views. If one person views your pages 30 times and another views it 20 times, your total for page views will be 50. Page views are any page that can be viewed, for instance your homepage (/), your search page (/search) and any question pages (/m/messageId).',
	},
	{
		question: 'What does a site hosted on my domain look like?',
		answer: (
			<>
				{"We've"} got a few examples of sites hosted on custom domains! Checkout{' '}
				<BlueLink href={'https://questions.answeroverflow.com'}>
					questions.answeroverflow.com
				</BlueLink>{' '}
				and{' '}
				<BlueLink href={'https://discord-questions.trpc.io'}>
					discord-questions.trpc.io
				</BlueLink>{' '}
				to see live examples.
			</>
		),
	},
	{
		question: 'What if someone spams my site?',
		answer:
			'If your site is DDoSed / page views are increased by some form of artificial usage, that will not count towards your limit.',
	},
	{
		question: 'What plan is right for me?',
		answer: `If you're a non profit or open source project, our free tier is great place to get started. For companies & commercial projects, the Pro plan is a great way to get content hosted on your own domain to eventually move up to the enterprise plan.`,
	},
	{
		question: 'What if I cancel my subscription?',
		answer:
			'We’ll work with you to figure out next steps to persist your content. Currently the only option is to leave your custom domain set and we will redirect from your domain back to answeroverflow.com. In the future, you will be able to self host Answer Overflow and this will be an alternative option. Our goal is to make sure all of your content stays active and working.',
	},
	{
		question:
			'What happens if I have content indexed on answeroverflow.com and I upgrade to my own domain?',
		answer:
			'All of your pages on answeroverflow are set as a permanent redirect to your new domain. Any visitors while the answeroverflow.com pages are still indexed in Google will be redirected to your custom domain. Eventually they will drop off and only your site will be  in search results.',
	},
	{
		question:
			'Why are my pages on answeroverflow.com doing a temporary redirect rather than a permanent one?',
		answer:
			"For the duration of your trial, your content will be doing a temporary redirect rather than a permanent redirect. This is to prevent having a lot of dead links in the event that you do not renew your subscription after your trial ends. When you're on the Pro plan, your pages do a permanent redirect.",
	},
	{
		question: 'None of these plans work for me, what can I do?',
		answer:
			"Answer Overflow is open source and you can self host it in the future! Self hosting is not currently supported, but if you'd like to submit a PR to add it, we'd love to work with you on that. If you have feedback on how our pricing can be improved, please use the feedback box below.",
	},
];

const FAQ = (props: {
	faqs: {
		question: React.ReactNode;
		answer: React.ReactNode;
	}[];
}) => (
	<Accordion type="single" className="my-16 w-full" collapsible>
		{props.faqs.map((faq, i) => (
			<AccordionItem
				value={`item-${i}`}
				key={i}
				className={'dark:border-neutral-700'}
			>
				<AccordionTrigger className={'text-left text-xl'}>
					{faq.question}
				</AccordionTrigger>
				<AccordionContent className={'text-lg'}>{faq.answer}</AccordionContent>
			</AccordionItem>
		))}
	</Accordion>
);

const PricingElement = (props: {
	title: string;
	cta: string;
	price: string;
	bestValue?: boolean;
	features: {
		icon?: React.ReactNode;
		name: React.ReactNode;
	}[];
	clarifications?: string[];
	ctaLink: string;
}) => {
	return (
		<div
			className={classNames(
				'border-ao-black/25 dark:border-ao-white/25 flex h-full max-w-lg flex-col items-center justify-start rounded-2xl border-2 p-8',
				props.bestValue ? 'border-indigo-600/75 dark:border-indigo-600/75' : '',
			)}
		>
			<div className={'flex h-24 w-full flex-col items-start justify-center'}>
				{props.bestValue && (
					<p className="rounded-full bg-indigo-600/10 px-2.5 py-1 text-xs font-semibold leading-5 text-indigo-600 dark:text-indigo-400">
						Most popular
					</p>
				)}
				<Heading.H2 className={'my-0 py-0 text-2xl font-medium'}>
					{props.title}
				</Heading.H2>
				<Heading.H3 className={'my-0 py-0 text-3xl'}>{props.price}</Heading.H3>
			</div>
			<div className="mt-8 flex h-full w-full flex-col justify-between">
				<div className="flex h-full w-full flex-col items-center justify-between gap-4">
					<ul className="grid w-full grid-cols-1 items-center gap-2">
						{props.features.map((feature, index) => (
							<li key={index} className="flex w-full flex-row gap-4">
								{feature.icon ?? <Check className="h-6 w-6 shrink-0" />}
								{feature.name}
							</li>
						))}
					</ul>
					<div className="flex flex-col items-center justify-center gap-2">
						{props.clarifications?.map((clarification, index) => (
							<div
								key={index}
								className="flex w-full flex-row gap-2 text-neutral-600 dark:text-neutral-400"
							>
								<span>{clarification}</span>
							</div>
						))}
					</div>
				</div>
				<LinkButton className={'mt-4 w-full'} href={props.ctaLink}>
					<b>{props.cta}</b>
				</LinkButton>
			</div>
		</div>
	);
};

const ProPlan = (props: { ctaLink: string; hasSubscribedBefore?: boolean }) => (
	<PricingElement
		title={'Starter'}
		cta={props.hasSubscribedBefore ? 'Resubscribe' : 'Start Free Trial'}
		bestValue={true}
		price={'$25 / month'}
		features={[
			{
				name: 'Ad free',
			},
			{
				name: 'Host on your own domain',
			},
			{
				name: 'Up to 100,000 monthly page views',
			},
			{
				name: 'Basic analytics (coming soon)',
			},
		]}
		ctaLink={props.ctaLink}
	/>
);

const EnterprisePlan = (props: {
	ctaLink: string;
	hasSubscribedBefore?: boolean;
}) => (
	<PricingElement
		title={'Pro'}
		cta={props.hasSubscribedBefore ? 'Resubscribe' : 'Start Free Trial'}
		price={'$150 / month'}
		features={[
			{
				name: 'Ad free',
			},
			{
				name: 'Host on your own domain',
			},
			{
				name: 'Up to 500,000 monthly page views',
			},
			{
				name: 'Advanced analytics (coming soon)',
			},
			{
				name: 'Priority support',
			},
		]}
		ctaLink={props.ctaLink}
		clarifications={[
			'If you need more than 500,000 page views, we will work with you to create a custom plan',
		]}
	/>
);
const EnterprisePricingOptions = () => (
	<div className="mx-auto my-8 grid w-full grid-cols-1 justify-items-center gap-8">
		<div className="mx-auto grid grid-cols-1 gap-16 xl:grid-cols-2">
			<ProPlan ctaLink={'/dashboard'} />
			<EnterprisePlan ctaLink={'/dashboard'} />
		</div>
	</div>
);

const EnterprisePricing = (props: { showFaqs?: boolean }) => (
	<>
		<div
			className={
				'mx-auto my-8 grid w-full grid-cols-1 justify-items-center gap-8'
			}
		>
			<span className="whitespace-pre-wrap text-center sm:hidden">
				Your own instance of Answer Overflow, hosted on your own domain. Perfect
				for companies looking for minimal branding, and to have full control
				over their content.
			</span>
		</div>
		<EnterprisePricingOptions />
		{props.showFaqs && <FAQ faqs={enterpriseFAQs} />}
	</>
);

const PublicPlatformPricing = (props: { showFaqs?: boolean }) => (
	<>
		<div className="mx-auto my-8 grid w-full grid-cols-1 justify-items-center gap-8">
			<span className="whitespace-pre-wrap text-center sm:hidden">
				Ad supported version of Answer Overflow allowing for unlimited page
				views and revenue share to communities. Perfect for communities of all
				sizes.
			</span>
			<PricingElement
				title={'Free'}
				cta={'Setup Now'}
				price={'$0 / month'}
				features={[
					{
						name: 'Hosted on answeroverflow.com',
					},
					{
						name: 'Unlimited page views',
					},
					{
						name: 'Ad supported',
					},
					{
						name: 'Revenue share (coming soon)',
					},
				]}
				clarifications={[
					'If you upgrade to a custom domain at any time your content will be redirected',
				]}
				ctaLink={'/onboarding'}
			/>
			{props.showFaqs && (
				<FAQ
					faqs={[
						{
							question: 'What ad provider is used?',
							answer: `We're using Google AdSense to serve ads. If you have any feedback on this, please use the feedback box below.`,
						},
						{
							question: 'How does the revenue share work?',
							answer: `We're still figuring out how to best do this. If you have any feedback on this, please use the feedback box below.`,
						},
					]}
				/>
			)}
		</div>
	</>
);

export const PricingOptions = (props: { showFaqs?: boolean }) => {
	const url = usePathname();
	const isViewingEnterprise = !url?.includes('enterprise');
	return (
		<div>
			<div className={'grid w-full grid-cols-2 gap-8'}>
				<LinkButton
					href={'/pricing/public-platform'}
					variant={isViewingEnterprise ? 'outline' : 'ghost'}
					className={
						'flex h-full max-h-full max-w-full grow flex-col items-center justify-start'
					}
				>
					<div
						className={
							'flex max-w-full flex-row items-center gap-4 text-primary'
						}
					>
						<IoMdGlobe className={'hidden h-16 w-16 shrink-0 md:block'} />
						<div className={'flex flex-col gap-4'}>
							<h2 className={'text-center text-xl font-bold'}>
								Public Platform
							</h2>

							<span
								className={
									'hidden whitespace-pre-wrap text-center text-lg sm:block'
								}
							>
								Ad supported version of Answer Overflow allowing for unlimited
								page views and revenue share to communities. Perfect for
								communities of all sizes.
							</span>
						</div>
					</div>
				</LinkButton>
				<LinkButton
					className={
						'flex h-full max-h-full max-w-full grow flex-col items-center justify-start'
					}
					variant={!isViewingEnterprise ? 'outline' : 'ghost'}
					href={'/pricing/enterprise'}
				>
					<div
						className={
							'flex max-w-full flex-row items-center gap-4 text-primary'
						}
					>
						<IoBusiness className={'hidden h-16 w-16 shrink-0 md:block'} />
						<div className={'flex flex-col gap-4'}>
							<h2 className={'text-center text-lg font-bold md:text-xl'}>
								Enterprise Platform
							</h2>
							<span className="hidden whitespace-pre-wrap text-center text-lg sm:block">
								Your own instance of Answer Overflow, hosted on your own domain.
								Perfect for companies looking for minimal branding, and to have
								full control over their content.
							</span>
						</div>
					</div>
				</LinkButton>
			</div>
			{url === '/pricing/enterprise' ? (
				<EnterprisePricing showFaqs={props.showFaqs} />
			) : (
				<PublicPlatformPricing showFaqs={props.showFaqs} />
			)}
		</div>
	);
};

export const Pricing = () => {
	return (
		<div className="my-6 max-w-6xl sm:mx-3 md:mx-auto">
			<Heading.H1 className={'text-center'}>Plans</Heading.H1>
			<PricingOptions showFaqs={true} />
			<form
				className="mx-auto my-16 flex max-w-2xl flex-col gap-4"
				onSubmit={(e) => {
					e.preventDefault();
					// @ts-ignore
					const [emailElement, feedbackElement] = e.target;
					const email = (emailElement as HTMLInputElement).value;
					const feedback = (feedbackElement as HTMLTextAreaElement).value;
					trackEvent('Pricing Feedback', {
						email,
						feedback,
					});
					toast.success('Feedback submitted thanks!');
				}}
			>
				<Heading.H2>Pricing Feedback</Heading.H2>
				<Input
					placeholder={'email (optional)'}
					type={'email'}
					id={'feedback-email'}
					autoComplete={'email'}
					className={'bg-inherit'}
				/>
				<Textarea
					className="h-32"
					placeholder={
						'What do you think of our pricing? What would you like to see?'
					}
					minLength={1}
					required
					inputMode={'text'}
				/>
				<Button>Submit</Button>
			</form>
		</div>
	);
};

export const PricingDialog = (props: {
	proPlanCheckoutUrl: string;
	enterprisePlanCheckoutUrl: string;
	hasSubscribedBefore?: boolean;
}) => {
	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button variant="outline">
					{props.hasSubscribedBefore ? 'Resubscribe' : 'Start free trial'}
				</Button>
			</DialogTrigger>
			<DialogContent className="max-h-screen max-w-5xl overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Pick a plan</DialogTitle>
				</DialogHeader>
				{/* TODO: If the server has more than 50k page views don't show pro plan */}
				<div className="mx-auto my-16 grid w-full grid-cols-1 gap-16 md:grid-cols-2">
					<ProPlan
						ctaLink={props.proPlanCheckoutUrl}
						hasSubscribedBefore={props.hasSubscribedBefore}
					/>
					<EnterprisePlan
						ctaLink={props.enterprisePlanCheckoutUrl}
						hasSubscribedBefore={props.hasSubscribedBefore}
					/>
				</div>
				<DialogFooter>
					<LinkButton href={'/pricing'}>Learn more</LinkButton>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};
