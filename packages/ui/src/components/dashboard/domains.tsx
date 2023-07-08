import {
	Card,
	Title,
	Subtitle,
	TabGroup,
	TabList,
	Tab,
	TabPanels,
	TabPanel,
} from '@tremor/react';
import type { ServerPublic } from '@answeroverflow/api';
import { useState } from 'react';
import { LuAlertCircle, LuXCircle, LuCheckCircle2 } from 'react-icons/lu';
import { toast } from 'react-toastify';
import { trpc } from '~ui/utils/trpc';
import { Button, Input, LoadingSpinner } from '../primitives';
import { useTierAccess } from '../primitives/tier-access-only';

export function useDomainStatus({ domain }: { domain?: string }) {
	const { data, isLoading, isFetching } =
		trpc.servers.verifyCustomDomain.useQuery(domain ?? '', {
			refetchOnMount: true,
			refetchInterval: 5000,
			keepPreviousData: true,
			enabled: domain !== undefined,
		});

	return {
		status: data?.status,
		domainJson: data?.domainJson,
		loading: isLoading,
		fetching: isFetching,
	};
}

export const getSubdomain = (name: string, apexName: string) => {
	if (name === apexName) return null;
	return name.slice(0, name.length - apexName.length - 1);
};
const InlineSnippet = ({ children }: { children: string }) => {
	return (
		<span className="inline-block rounded-md bg-blue-100 px-1 py-0.5 font-mono text-blue-900">
			{children}
		</span>
	);
};

export function ConfigureDomainCard(props: {
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

export function DomainConfiguration({ domain }: { domain: string }) {
	const [recordType, setRecordType] = useState<'A' | 'CNAME'>('A');
	const { status, domainJson } = useDomainStatus({ domain });

	if (!status || status === 'Valid Configuration' || !domainJson) return null;

	const subdomain = getSubdomain(domainJson.name, domainJson.apexName);

	const txtVerification =
		(status === 'Pending Verification' &&
			domainJson.verification.find(
				(x) => (x.type as 'TXT' | 'CNAME' | 'A') === 'TXT',
			)) ||
		null;

	return (
		<div className="border-t border-gray-200 px-6 pb-5 pt-7">
			<div className="mb-4 flex items-center space-x-2">
				{status === 'Pending Verification' ? (
					<LuAlertCircle fill="#FBBF24" stroke="white" />
				) : (
					<LuXCircle fill="#DC2626" stroke="white" />
				)}
				<Title>{status}</Title>
			</div>
			{txtVerification ? (
				<>
					<p className="text-sm">
						Please set the following TXT record on{' '}
						<InlineSnippet>{domainJson.apexName}</InlineSnippet> to prove
						ownership of <InlineSnippet>{domainJson.name}</InlineSnippet>:
					</p>
					<div className="my-5 flex items-start justify-start space-x-10 rounded-md bg-gray-50 p-2 dark:bg-gray-800">
						<div>
							<p className="text-sm font-bold">Type</p>
							<p className="mt-2 font-mono text-sm">{txtVerification.type}</p>
						</div>
						<div>
							<p className="text-sm font-bold">Name</p>
							<p className="mt-2 font-mono text-sm">
								{txtVerification.domain.slice(
									0,
									txtVerification.domain.length -
										domainJson.apexName.length -
										1,
								)}
							</p>
						</div>
						<div>
							<p className="text-sm font-bold">Value</p>
							<p className="mt-2 font-mono text-sm">
								<span className="text-ellipsis">{txtVerification.value}</span>
							</p>
						</div>
					</div>
					<p className="text-sm">
						Warning: if you are using this domain for another site, setting this
						TXT record will transfer domain ownership away from that site and
						break it. Please exercise caution when setting this record.
					</p>
				</>
			) : status === 'Unknown Error' ? (
				<p className="mb-5 text-sm">{domainJson.error.message}</p>
			) : (
				<>
					<TabGroup
						onIndexChange={(index) => {
							setRecordType(index === 0 ? 'A' : 'CNAME');
						}}
					>
						<TabList>
							<Tab>A Record{!subdomain && ' (recommended)'}</Tab>
							<Tab>CNAME Record{subdomain && ' (recommended)'}</Tab>
						</TabList>
						{/* A record */}
						<TabPanels>
							<TabPanel>
								<div className="flex items-center justify-start space-x-10 overflow-x-auto rounded-md bg-gray-50 p-2 dark:bg-gray-800">
									<div>
										<p className="text-sm font-bold">Type</p>
										<p className="mt-2 font-mono text-sm">A</p>
									</div>
									<div>
										<p className="text-sm font-bold">Name</p>
										<p className="mt-2 font-mono text-sm">@</p>
									</div>
									<div>
										<p className="text-sm font-bold">Value</p>
										<p className="mt-2 font-mono text-sm">76.76.21.21</p>
									</div>
									<div>
										<p className="text-sm font-bold">TTL</p>
										<p className="mt-2 font-mono text-sm">86400</p>
									</div>
								</div>
							</TabPanel>
							{/* CNAME record */}
							<TabPanel>
								<div className="flex items-center justify-start space-x-10 overflow-x-auto rounded-md bg-gray-50 p-2 dark:bg-gray-800">
									<div>
										<p className="text-sm font-bold">Type</p>
										<p className="mt-2 font-mono text-sm">CNAME</p>
									</div>
									<div>
										<p className="text-sm font-bold">Name</p>
										<p className="mt-2 font-mono text-sm">
											{subdomain ?? 'www'}
										</p>
									</div>
									<div>
										<p className="text-sm font-bold">Value</p>
										<p className="mt-2 font-mono text-sm">cname.dub.sh</p>
									</div>
									<div>
										<p className="text-sm font-bold">TTL</p>
										<p className="mt-2 font-mono text-sm">86400</p>
									</div>
								</div>
							</TabPanel>
						</TabPanels>
					</TabGroup>
					<div className="my-3 text-left">
						<p className="my-5 text-sm">
							To configure your{' '}
							{recordType === 'A' ? 'apex domain' : 'subdomain'}{' '}
							<InlineSnippet>
								{recordType === 'A' ? domainJson.apexName : domainJson.name}
							</InlineSnippet>
							, set the following {recordType} record on your DNS provider to
							continue:
						</p>

						<p className="mt-5 text-sm">
							Note: for TTL, if <InlineSnippet>86400</InlineSnippet> is not
							available, set the highest value possible. Also, domain
							propagation can take up to an hour.
						</p>
					</div>
				</>
			)}
		</div>
	);
}

export function DomainStatus({ domain }: { domain: string }) {
	const { status, loading } = useDomainStatus({ domain });

	return (
		<div className="absolute right-3 z-10 flex h-full items-center">
			{loading ? (
				<LoadingSpinner />
			) : status === 'Valid Configuration' ? (
				<LuCheckCircle2 fill="#2563EB" stroke="white" />
			) : status === 'Pending Verification' ? (
				<LuAlertCircle fill="#FBBF24" stroke="white" />
			) : (
				<LuXCircle fill="#DC2626" stroke="white" />
			)}
		</div>
	);
}
