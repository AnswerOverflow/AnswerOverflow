import { Button, Heading, ServerIcon } from '~ui/components/primitives';
import { useOnboardingContext } from './OnboardingLanding';
import { trpc } from '~ui/utils/trpc';
import type { ServerPublic } from '@answeroverflow/api';

export const WaitingToBeAdded = () => {
	const { goToPage, data } = useOnboardingContext();
	const { status, dataUpdatedAt } = trpc.servers.byIdPublic.useQuery(
		data.server!.id,
		{
			refetchInterval: 5000,
			refetchIntervalInBackground: false,
			refetchOnWindowFocus: true,
		},
	);

	return (
		<WaitingToBeAddedRenderer
			server={data.server!}
			timeSinceLastCheckInSeconds={Math.round(
				(Date.now() - dataUpdatedAt) / 1000,
			)}
			hasJoined={status === 'success'}
		/>
	);
};

export const WaitingToBeAddedRenderer = (props: {
	server: ServerPublic;
	timeSinceLastCheckInSeconds: number;
	hasJoined: boolean;
}) => {
	if (props.hasJoined) {
		return (
			<div className="flex flex-col items-center justify-center gap-8 text-center">
				<Heading.H1>Joined {props.server.name}!</Heading.H1>
				<ServerIcon size={'xl'} server={props.server} />
				<Button size={'lg'}>Continue</Button>
			</div>
		);
	}
	return (
		<div className="flex flex-col items-center justify-center gap-8 text-center">
			<Heading.H1>Waiting to join {props.server.name}</Heading.H1>
			<div className="h-32 w-32 animate-spin rounded-full border-b-4 border-ao-blue" />
			<span className="text-ao-black dark:text-ao-white">
				Last checked {props.timeSinceLastCheckInSeconds} second
				{props.timeSinceLastCheckInSeconds === 1 ? '' : 's'} ago.
			</span>
		</div>
	);
};
