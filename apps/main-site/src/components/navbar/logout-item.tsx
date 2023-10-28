'use client';
import { DropdownMenuItem } from '@answeroverflow/ui/src/components/primitives/ui/dropdown-menu';
import { LuLogOut } from 'react-icons/lu';
import React from 'react';
import { useRouter } from 'next/navigation';
import type { ServerPublic } from '@answeroverflow/api';

export function LogoutItem(props: { tenant: ServerPublic | undefined }) {
	const router = useRouter();

	return (
		<DropdownMenuItem
			onClick={() => {
				if (props.tenant) {
					const redirect =
						typeof window !== 'undefined' ? window.location.href : '';
					// navigate to /api/auth/tenant/signout?redirect=currentUrl
					router.push(`/api/auth/tenant/signout?redirect=${redirect}`);
				} else {
					void import('next-auth/react').then(({ signOut }) => {
						void signOut({
							callbackUrl: '/',
						});
					});
				}
			}}
		>
			<LuLogOut className="mr-2 h-4 w-4" />
			<span className="w-full">Log out</span>
		</DropdownMenuItem>
	);
}
