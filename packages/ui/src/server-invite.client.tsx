'use client';
// have to have a separate file because react sucks

import { trpc } from './utils/client';

export function ServerInviteJoinText(props: { id: string }) {
	const { id } = props;
	const { data } = trpc.auth.getServers.useQuery();
	if (id === '864296203746803753') {
		return '질문하러가기';
	}
	if (!data || !data?.some((server) => server.id === id)) {
		return 'Join';
	}
	return 'Joined';
}
