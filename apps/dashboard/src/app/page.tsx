'use client';
import { useEffect } from 'react';
import { trpc } from 'packages/ui/src/utils/client';
import { useRouter } from 'next/navigation';

export default function Onboarding() {
	// Eventually move this into the url
	const router = useRouter();
	const { data: servers } =
		trpc.auth.getServersForOnboarding.useQuery(undefined);

	useEffect(() => {
		if (servers && servers.length === 1 && servers[0]) {
			return router.push(`/${servers[0].id}`);
		}
		return router.push('/onboarding');
	}, [servers, router]);

	return null;
}
