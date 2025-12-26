"use client";

import { api } from "@packages/database/convex/_generated/api";
import { cn } from "@packages/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { useAction, useMutation } from "convex/react";
import { AlertCircle, CheckCircle2, LoaderCircle, XCircle } from "lucide-react";
import { type HTMLAttributes, useState } from "react";
import { Badge } from "./badge";
import { Button } from "./button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "./card";
import { DNSTable } from "./dns-table";
import { Input } from "./input";

export type InlineSnippetProps = HTMLAttributes<HTMLSpanElement>;

export const InlineSnippet = ({ className, ...props }: InlineSnippetProps) => (
	<span
		className={cn(
			"rounded-md bg-muted px-1 py-0.2 font-mono text-sm",
			className,
		)}
		{...props}
	/>
);

export const useDomainStatus = (domain: string) => {
	const getDomainStatus = useAction(
		api.authenticated.vercel_domains.getDomainStatus,
	);

	return useQuery({
		queryKey: ["domain-status", domain],
		queryFn: () => getDomainStatus({ domain }),
		enabled: !!domain,
		refetchInterval: 20_000,
	});
};

export const preloadDomainStatus = (_domain: string) => {
	// No-op: preloading not needed without SWR
};

export type DomainConfigurationProps = HTMLAttributes<HTMLDivElement> & {
	domain: string;
};

export const DomainConfiguration = ({
	domain,
	className,
	...props
}: DomainConfigurationProps) => {
	const { data, isLoading, refetch, isFetching } = useDomainStatus(domain);

	if (isLoading || !data) {
		return null;
	}

	if (data.status === "Domain is not added") {
		return (
			<div
				className={cn(
					"w-full text-left text-muted-foreground text-sm",
					className,
				)}
			>
				<p>Save the domain to add it to your site.</p>
			</div>
		);
	}

	return (
		<div className={cn("w-full space-y-4", className)} {...props}>
			{data.status === "Pending Verification" ? (
				<div className="w-full text-left text-muted-foreground text-sm">
					Please set the following TXT record on{" "}
					<InlineSnippet>{data.dnsRecordsToSet?.name}</InlineSnippet> to prove
					ownership of <InlineSnippet>{domain}</InlineSnippet>:
				</div>
			) : (
				<div
					className={cn(
						"w-full text-left text-muted-foreground text-sm",
						className,
					)}
				>
					Set the following DNS records to your domain provider:
				</div>
			)}

			{data.dnsRecordsToSet && <DNSTable records={[data.dnsRecordsToSet]} />}

			<div className="flex w-full justify-end">
				<Button
					disabled={isFetching}
					onClick={() => refetch()}
					size="sm"
					type="button"
					variant="outline"
				>
					{isFetching ? (
						<>
							<LoaderCircle className="animate-spin" /> Refresh
						</>
					) : (
						"Refresh"
					)}
				</Button>
			</div>
		</div>
	);
};

export type DomainStatusIconProps = {
	domain: string;
};

export const DomainStatusIcon = ({ domain }: DomainStatusIconProps) => {
	const { data, isLoading } = useDomainStatus(domain);

	if (isLoading) {
		return <LoaderCircle className="animate-spin text-black dark:text-white" />;
	}

	if (data?.status === "Valid Configuration") {
		return (
			<CheckCircle2
				className="text-white dark:text-white"
				fill="#2563EB"
				stroke="currentColor"
			/>
		);
	}

	if (data?.status === "Pending Verification") {
		return (
			<AlertCircle
				className="text-white dark:text-black"
				fill="#FBBF24"
				stroke="currentColor"
			/>
		);
	}

	if (data?.status === "Domain is not added") {
		return (
			<XCircle
				className="text-white dark:text-black"
				fill="#DC2626"
				stroke="currentColor"
			/>
		);
	}

	if (data?.status === "Invalid Configuration") {
		return (
			<XCircle
				className="text-white dark:text-black"
				fill="#DC2626"
				stroke="currentColor"
			/>
		);
	}

	return null;
};

export type CustomDomainProps = {
	defaultDomain?: string;
	serverId: bigint;
	className?: string;
};

export const CustomDomain = (props: CustomDomainProps) => {
	const [domain, setDomain] = useState<string | null>(
		props.defaultDomain ?? null,
	);
	const [submitting, setSubmitting] = useState(false);
	const addDomain = useAction(api.authenticated.vercel_domains.addDomain);
	const updateCustomDomain = useMutation(
		api.authenticated.dashboard_mutations.updateCustomDomain,
	);
	const domainStatus = useDomainStatus(domain ?? "");
	const isValidConfiguration =
		domainStatus.data?.status === "Valid Configuration";
	const isRefreshing = domainStatus.isFetching;

	return (
		<form
			className={"@container w-full"}
			onSubmit={async (event) => {
				event.preventDefault();
				setSubmitting(true);
				const data = new FormData(event.currentTarget);
				const customDomain = (data.get("customDomain") as string)
					.toLowerCase()
					.trim();

				if (customDomain === "") {
					await updateCustomDomain({
						serverId: props.serverId,
						customDomain: null,
					});
					setDomain(null);
				} else {
					await addDomain({ domain: customDomain });
					await updateCustomDomain({
						serverId: props.serverId,
						customDomain: customDomain,
					});
					setDomain(customDomain);
				}
				setSubmitting(false);
			}}
		>
			<Card className={cn("flex flex-col", props.className)}>
				<CardHeader className="relative flex flex-col text-left">
					<div className="flex items-center gap-2 relative w-full">
						<CardTitle>Custom Domain</CardTitle>
						{isValidConfiguration && (
							<Badge className="bg-blue-500 text-white border-blue-500">
								Valid Configuration
							</Badge>
						)}
						{isRefreshing && isValidConfiguration && (
							<LoaderCircle className="hidden sm:block h-4 w-4 animate-spin text-muted-foreground" />
						)}
					</div>
					<CardDescription>
						The custom domain for your site. Leave empty to remove.
					</CardDescription>
				</CardHeader>
				<CardContent className="relative flex w-full @sm:flex-row flex-col items-center justify-start @sm:justify-between gap-2">
					<Input
						defaultValue={props.defaultDomain}
						maxLength={64}
						name="customDomain"
						onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
							e.target.value = e.target.value.toLowerCase();
						}}
						placeholder={"example.com"}
						type="text"
					/>
					<Button className="@sm:w-16 w-full" type="submit" variant="outline">
						{submitting ? <LoaderCircle className="animate-spin" /> : "Save"}
					</Button>
				</CardContent>
				{domain && !isValidConfiguration && (
					<CardFooter className="flex flex-col gap-4 border-muted border-t-2 pt-4 text-sm">
						<DomainConfiguration domain={domain} />
					</CardFooter>
				)}
			</Card>
		</form>
	);
};
