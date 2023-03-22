import { Button, LinkButton } from './primitives';
import { signIn } from 'next-auth/react';
import { GETTING_STARTED_URL } from '@answeroverflow/constants/src/links';
export function GetStarted() {
	return (
		<LinkButton href={GETTING_STARTED_URL} variant="outline">
			Get started
		</LinkButton>
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
