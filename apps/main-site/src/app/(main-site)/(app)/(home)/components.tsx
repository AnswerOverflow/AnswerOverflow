import { Server } from '@answeroverflow/core/schema';
import { findServerById } from '@answeroverflow/core/server';
import { ServerIcon } from '@answeroverflow/ui/server-icon';
import { LinkButton } from '@answeroverflow/ui/ui/link-button';

function shortenNumber(num: number) {
	if (num >= 1000000) {
		return (num / 1000000).toFixed(1) + 'M';
	} else if (num >= 1000) {
		return (num / 1000).toFixed(1) + 'k';
	} else {
		return num.toString();
	}
}
export const TrendingServer = async (props: { server: Server }) => {
	const { server } = props;
	const approximateMemberCount = server.approximateMemberCount;
	return (
		<LinkButton
			href={`/c/${server.id}`}
			variant={'outline'}
			className={'flex w-full flex-row justify-between gap-2 bg-card'}
		>
			<div className={'flex items-center gap-2'}>
				<ServerIcon server={server} size={24} />
				<span>{server.name}</span>
			</div>
			<span>{shortenNumber(approximateMemberCount)} members</span>
		</LinkButton>
	);
};
