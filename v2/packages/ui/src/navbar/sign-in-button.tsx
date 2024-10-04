'use client';
import type { ServerPublic } from '@answeroverflow/api';
import { makeMainSiteLink } from '@answeroverflow/constants/links';
import { Button, ButtonProps } from '../ui/button';
import { LinkButton } from '../ui/link-button';

export function SignInButton(
	props: ButtonProps & {
		tenant: ServerPublic | undefined;
	},
) {
	const { tenant } = props;
	if (tenant) {
		const link = makeMainSiteLink('/api/auth/tenant/signin');
		const redirect =
			typeof window !== 'undefined'
				? window.location.href
				: `http://${tenant.customDomain!}`;

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
		<Button
			variant="outline"
			onClick={() => {
				void import('next-auth/react').then(({ signIn }) => {
					void signIn('discord');
				});
			}}
			{...props}
		>
			Login
		</Button>
	);
}
