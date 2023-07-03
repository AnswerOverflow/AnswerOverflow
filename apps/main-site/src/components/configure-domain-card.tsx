import { toast } from 'react-toastify';
import DomainStatus from './domain-status';
import DomainConfiguration from './domain-configuration';
import { Button, LoadingSpinner, trpc } from '@answeroverflow/ui';
import { ServerPublic } from '@answeroverflow/api';
import { useDomainStatus } from './use-domain-status';

export default function ConfigureDomainCard(props: {
	server: Pick<ServerPublic, 'id' | 'customDomain'>;
}) {
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
			className="rounded-lg border border-stone-200 bg-white"
		>
			<div className="relative flex flex-col space-y-4 p-5 sm:p-10">
				<div className="flex items-center justify-between">
					<div>
						<h2 className="text-xl">Custom Domain</h2>
						<p className="text-sm text-stone-500">
							The custom domain for your site.
						</p>
					</div>
					<Button
						onClick={() => {
							void util.servers.verifyCustomDomain.invalidate();
						}}
						type="button"
						disabled={fetching}
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
					<input
						name="customDomain"
						type="text"
						defaultValue={currentDomain || ''}
						placeholder="yourdomain.com"
						maxLength={64}
						pattern={'[a-z0-9]+([\\-\\.]{1}[a-z0-9]+)*\\.[a-z]{2,5}$'}
						className="z-10 flex-1 rounded-md border border-stone-300 text-sm text-stone-900 placeholder:text-stone-300 focus:border-stone-500 focus:outline-none focus:ring-stone-500"
					/>
					{currentDomain && <DomainStatus domain={currentDomain} />}
				</div>
			</div>
			{currentDomain && <DomainConfiguration domain={currentDomain} />}
			<div className="flex flex-col items-center justify-center space-y-2 rounded-b-lg border-t border-stone-200 bg-stone-50 p-3 sm:flex-row sm:justify-between sm:space-y-0 sm:px-10">
				<p className="text-sm text-stone-500">Please enter a valid domain.</p>
			</div>
		</form>
	);
}
