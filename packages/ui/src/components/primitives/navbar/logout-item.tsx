'use client';
import { DropdownMenuItem } from '~ui/components/primitives/ui/dropdown-menu';
import { signOut } from 'next-auth/react';
import { LuLogOut } from 'react-icons/lu';
import React from 'react';
import { useRouter } from 'next/navigation';

export function LogoutItem(props: { isOnTenantSite: boolean }) {
	const router = useRouter();

	return (
		<DropdownMenuItem
			onClick={() => {
				if (props.isOnTenantSite) {
					const redirect =
						typeof window !== 'undefined' ? window.location.href : '';
					// navigate to /api/auth/tenant/signout?redirect=currentUrl
					router.push(`/api/auth/tenant/signout?redirect=${redirect}`);
				} else {
					void signOut({
						callbackUrl: '/',
					});
				}
			}}
		>
			<LuLogOut className="mr-2 h-4 w-4" />
			<span className="w-full">Log out</span>
		</DropdownMenuItem>
	);
}
