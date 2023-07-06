import { toast } from 'react-toastify';
import DomainStatus from './domain-status';
import DomainConfiguration from './domain-configuration';
import { Button, Input, LoadingSpinner, trpc } from '@answeroverflow/ui';
import { ServerPublic } from '@answeroverflow/api';
import { useDomainStatus } from './use-domain-status';
import { Card, Title, Subtitle } from '@tremor/react';
import { useTierAccess } from './tier-access-only';
export default function ConfigureDomainCard(props: {
	server: Pick<ServerPublic, 'id' | 'customDomain'>;
}) {
	const { enabled } = useTierAccess();
	const { customDomain: currentDomain, id } = props.server;
	const util = trpc.useContext();
	const mutation = trpc.servers.setCustomDomain.useMutation({
		onSuccess: () => {
			toast.success('Custom domain updated!');
			void util.servers.fetchDashboardById.invalidate(id);
		},
		onError: (err) => {
			toast.error(err.message);
		},
	});
	const { fetching } = useDomainStatus({ domain: currentDomain ?? undefined });

	return (
		<Card>
			<form
				onSubmit={(e) => {
					e.preventDefault();
					// @ts-ignore
					// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
					const newDomain = e.target[1].value as string;
					if (
						currentDomain &&
						newDomain !== currentDomain &&
						!confirm('Are you sure you want to change your custom domain?')
					) {
						return;
					}

					mutation.mutate({
						customDomain: newDomain,
						serverId: id,
					});
				}}
			>
				<div className="relative flex flex-col space-y-4 p-5">
					<div className="flex items-center justify-between">
						<div>
							<Title>Custom domain</Title>
							<Subtitle>The custom domain for your site.</Subtitle>
						</div>
						<Button
							onClick={() => {
								void util.servers.verifyCustomDomain.invalidate();
							}}
							type="button"
							disabled={!enabled || fetching}
							variant={'outline'}
							className="relative"
						>
							{fetching && (
								<>
									<div className="absolute right-16 z-10 flex h-full items-center">
										<LoadingSpinner />
									</div>
									<div className="w-6" />
								</>
							)}
							Refresh
						</Button>
					</div>
					<div className="relative flex w-full max-w-md">
						<Input
							name="customDomain"
							type="text"
							key={currentDomain ?? props.server.id}
							defaultValue={currentDomain || ''}
							placeholder="yourdomain.com"
							maxLength={64}
							disabled={!enabled}
							pattern={'[a-z0-9]+([\\-\\.]{1}[a-z0-9]+)*\\.[a-z]{2,5}$'}
						/>
						{currentDomain && <DomainStatus domain={currentDomain} />}
					</div>
				</div>
				{currentDomain && <DomainConfiguration domain={currentDomain} />}
				<div className="flex flex-col items-center justify-center space-y-2 rounded-b-lg border-t border-stone-200 bg-stone-50 p-3 dark:bg-stone-900 sm:flex-row sm:justify-between sm:space-y-0 sm:px-6">
					<p className="text-sm text-stone-500 dark:text-stone-400">
						Please enter a valid domain.
					</p>
				</div>
			</form>
		</Card>
	);
}
