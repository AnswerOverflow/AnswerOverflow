import { ClientAutoSignIn } from './client-auto-sign-in';
import { getServerSession } from '@answeroverflow/auth';
import { redirect } from 'next/navigation';

export default async function DashboardAuth() {
	const session = await getServerSession();
	if (session) {
		redirect(
			// eslint-disable-next-line n/no-process-env
			process.env.NEXT_PUBLIC_DEPLOYMENT_ENV === 'local'
				? 'http://localhost:3002'
				: 'https://app.answeroverflow.com',
		);
	}
	return (
		<div>
			<h1>{"We're"} redirecting you to sign in</h1>
			<ClientAutoSignIn />
		</div>
	);
}
