import { LinkButton, type LinkButtonProps } from '.';
import { signIn } from 'next-auth/react';
import {
	trackEvent,
	type GettingStartedClickProps,
	useTenantContext,
} from '@answeroverflow/hooks';
import { makeMainSiteLink } from '@answeroverflow/constants/src/links';
import { Button, ButtonProps } from '~ui/components/primitives/ui/button';
export function GetStarted(
	props: Omit<LinkButtonProps, 'href'> & {
		location: GettingStartedClickProps['Button Location'];
	},
) {
	return (
		<LinkButton
			href={'/onboarding'}
			variant="outline"
			onMouseUp={() => {
				// Use mouse up to capture middle click and right click
				trackEvent('Getting Started Click', {
					'Button Location': props.location,
				});
			}}
			{...props}
		>
			{props.children || 'Get Started'}
		</LinkButton>
	);
}

export function SignInButton(props: ButtonProps) {
	const { isOnTenantSite } = useTenantContext();

	if (isOnTenantSite) {
		const link = makeMainSiteLink('/api/auth/tenant/signin');
		const redirect = typeof window !== 'undefined' ? window.location.href : '';

		return (
			<LinkButton
				variant="outline"
				href={`${link}?redirect=${encodeURIComponent(redirect)}`}
			>
				Login
			</LinkButton>
		);
	}
	return (
		// TODO: Swap to href
		// eslint-disable-next-line @typescript-eslint/no-misused-promises
		<Button variant="outline" onClick={() => signIn('discord')} {...props}>
			Login
		</Button>
	);
}

export function AddToServerButton() {
	return (
		<LinkButton
			href="https://discord.com/oauth2/authorize?client_id=958907348389339146&permissions=328565083201&scope=bot+applications.commands"
			onMouseUp={() => {
				trackEvent('Add To Server Click', {
					'Button Location': 'Quick Start',
				});
			}}
		>
			Add To Server
		</LinkButton>
	);
}
