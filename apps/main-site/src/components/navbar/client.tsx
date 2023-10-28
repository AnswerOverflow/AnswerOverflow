'use client';
import dynamic from 'next/dynamic';
export const ClientUserAvatar = dynamic(
	() => import('./user-dropdown').then((mod) => mod.UserAvatar),
	{
		ssr: false,
	},
);
