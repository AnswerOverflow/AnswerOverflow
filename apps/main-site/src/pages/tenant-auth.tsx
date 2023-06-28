import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/router';

export default function TenantAuth() {
	const { status } = useSession();
	const router = useRouter();
	const { query } = router;
	const redirect = query.redirect ? (query.redirect as string) : '/';
	if (status === 'unauthenticated') {
		void signIn('discord');
	} else if (status === 'authenticated') {
		void router.push(redirect);
	}

	return (
		<>
			<h1>Authentication By Answer Overflow</h1>
		</>
	);
}
