'use client';
import { Check } from 'lucide-react';
import React from 'react';
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from './ui/accordion';
import { BlueLink } from './ui/blue-link';
import { Button } from './ui/button';
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from './ui/dialog';
import { classNames } from './utils/utils';

import { usePathname } from 'next/navigation';
import { IoMdGlobe } from 'react-icons/io';
import { IoBusiness } from 'react-icons/io5';
import { Heading } from './ui/heading';
import { LinkButton } from './ui/link-button';
const enterpriseFAQs: {
	question: React.ReactNode;
	answer: React.ReactNode;
}[] = [
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
		price={'$125 / month'}
		features={[
			{
				name: 'Ad free',
			},
			{
				name: 'Host on your own domain',
			},
			{
				name: 'Unlimited page views',
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
		title={'Advanced'}
		cta={props.hasSubscribedBefore ? 'Resubscribe' : 'Start Free Trial'}
		price={'$250 / month'}
		features={[
			{
				name: 'Ad free',
			},
			{
				name: 'Host on your own domain',
			},
			{
				name: 'Host on your own subpath, i.e /community',
			},
			{
				name: 'Unlimited page views',
			},
			{
				name: 'Priority support',
			},
		]}
		ctaLink={props.ctaLink}
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
				]}
				clarifications={[
					'If you upgrade to a custom domain at any time your content will be redirected',
				]}
				ctaLink={'/onboarding'}
			/>
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
								page views. Perfect for communities of all sizes.
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
								Paid Platform
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
				<Button variant="outline" className="max-w-32">
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
