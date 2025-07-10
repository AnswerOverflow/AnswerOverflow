import { Auth } from '@answeroverflow/core/auth';
import { redirect } from 'next/navigation';
import { ClientAutoSignIn } from './client-auto-sign-in';

export default async function DashboardAuth() {
	const session = await Auth.getServerSession();
	if (session) {
		// Dynamic dashboard URL based on deployment environment
		const dashboardUrl =
			// eslint-disable-next-line n/no-process-env
			process.env.NEXT_PUBLIC_VERCEL_URL
				// eslint-disable-next-line n/no-process-env
				? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
				// eslint-disable-next-line n/no-process-env
				: process.env.NEXT_PUBLIC_DEPLOYMENT_ENV === 'local'
				? 'http://localhost:3002'
				: 'https://app.answeroverflow.com';
		redirect(dashboardUrl);
	}
	return (
		<div>
			<h1>{"We're"} redirecting you to sign in</h1>
			<ClientAutoSignIn />
		</div>
	);
}
