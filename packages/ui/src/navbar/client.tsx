'use client';
import dynamic from 'next/dynamic';
import { Skeleton } from '../ui/skeleton';
// eslint-disable-next-line @typescript-eslint/naming-convention
export const ClientUserAvatar = dynamic(
	() => import('./user-dropdown').then((mod) => mod.UserAvatar),
	{
		ssr: false,
		loading: () => <Skeleton className="size-10 rounded-full" />,
	},
);

// eslint-disable-next-line @typescript-eslint/naming-convention
const ClientSignInButton = dynamic(
	() => import('./sign-in-button').then((mod) => mod.SignInButton),
	{
		ssr: false,
		loading: () => <Skeleton className="h-10 w-20 rounded" />,
	},
);

import { ServerPublic } from '@answeroverflow/api/router/types';
import { trpc } from '../utils/client';

export function UserSection(props: {
	tenant: ServerPublic | undefined;
	dashboard?: boolean;
}) {
	const { tenant } = props;
	const { data } = trpc.auth.getSession.useQuery();

	if (!data)
		return <ClientSignInButton tenant={tenant} dashboard={props.dashboard} />;
	return <ClientUserAvatar user={data.user} tenant={props.tenant} />;
}
