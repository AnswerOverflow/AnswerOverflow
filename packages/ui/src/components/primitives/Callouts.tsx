import { Button, LinkButton, type ButtonProps, type LinkButtonProps } from '.';
import { signIn } from 'next-auth/react';
import {
	trackEvent,
	type GettingStartedClickProps,
} from '@answeroverflow/hooks';
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
