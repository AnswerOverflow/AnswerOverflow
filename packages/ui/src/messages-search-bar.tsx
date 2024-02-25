'use client';
import { useRouter } from 'next/navigation';
import { useRouterQuery, useRouterServerId } from './utils/hooks';
import { useState } from 'react';
import { twMerge } from 'tailwind-merge';
import { Input } from './ui/input';

export const MessagesSearchBar = (props: {
	placeholder?: string;
	className?: string;
	serverId?: string;
}) => {
	const router = useRouter();
	const query = useRouterQuery();
	const serverId = useRouterServerId();
	const [searchInput, setSearchInput] = useState<string>(query ?? '');
	return (
		<form
			// eslint-disable-next-line @typescript-eslint/no-misused-promises
			onSubmit={(e) => {
				e.preventDefault();
				const params = new URLSearchParams();
				params.set('q', searchInput);
				const serverIdToFilterTo = props.serverId ?? serverId;
				if (serverIdToFilterTo) {
					params.set('s', serverIdToFilterTo);
				}
				router.push(`/search?${params.toString()}`);
			}}
			className={twMerge('w-full', props.className)}
		>
			<Input
				defaultValue={query || ''}
				className={twMerge('mb-4 w-full', props.className)}
				onChange={(e) => setSearchInput(e.target.value)}
				placeholder={props.placeholder ?? 'Search'}
				type={'search'}
			/>
		</form>
	);
};
