import * as Dialog from '@radix-ui/react-dialog';
import { Button, ButtonProps, LinkButton } from '.';
import { signIn } from 'next-auth/react';
import { trackEvent, GettingStartedClickProps } from '@answeroverflow/hooks';
import { GetStartedModal } from '../pages/home/GetStartedModal/GetStartedModal';
export function GetStarted(
	props: Omit<ButtonProps, 'href'> & {
		location: GettingStartedClickProps['Button Location'];
	},
) {
	return (
		<Dialog.Root>
			<Dialog.Trigger asChild>
				<Button
					variant="outline"
					onClick={() => {
						// Use mouse up to capture middle click and right click
						trackEvent('Getting Started Click', {
							'Button Location': props.location,
						});
					}}
					{...props}
				>
					{props.children || 'Get Started'}
				</Button>
			</Dialog.Trigger>
			<GetStartedModal />
		</Dialog.Root>
	);
}

export function SignInButton() {
	return (
		// TODO: Swap to href
		// eslint-disable-next-line @typescript-eslint/no-misused-promises
		<Button variant="outline" onClick={() => signIn('discord')}>
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
