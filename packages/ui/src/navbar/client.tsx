'use client';
import dynamic from 'next/dynamic';

import { Skeleton } from '../ui/skeleton';
// eslint-disable-next-line @typescript-eslint/naming-convention
export const ClientUserAvatar = dynamic(
	() => import('./user-dropdown').then((mod) => mod.UserAvatar),
	{
		ssr: false,
		loading: () => <Skeleton className="h-12 w-12 rounded-full" />,
	},
);
