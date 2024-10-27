'use client';

import { ChannelWithFlags } from '@answeroverflow/core/zod';
import { Button } from '@answeroverflow/ui/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@answeroverflow/ui/ui/card';
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from '@answeroverflow/ui/ui/command';
import { Label } from '@answeroverflow/ui/ui/label';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@answeroverflow/ui/ui/popover';
import { Switch } from '@answeroverflow/ui/ui/switch';
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from '@answeroverflow/ui/ui/tabs';
import { trpc } from '@answeroverflow/ui/utils/client';
import { cn } from '@answeroverflow/ui/utils/utils';
import { ChannelType } from 'discord-api-types/v10';
import {
	Check,
	ChevronsUpDown,
	MessageSquare,
	HashIcon,
	Megaphone,
} from 'lucide-react';
import * as React from 'react';
import { toast } from 'react-toastify';
import { useDashboardContext } from '../components/dashboard-context';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@answeroverflow/ui/ui/select';

function ChannelIcon({
	type,
	className,
}: { type: ChannelType; className?: string }) {
	if (type === ChannelType.GuildForum) {
		return <MessageSquare className={className} />;
	}
	if (type === ChannelType.GuildAnnouncement) {
		return <Megaphone className={className} />;
	}
	return <HashIcon className={className} />;
}

function ChannelDropdown(props: {
	values: {
		name: string;
		id: string;
		type: ChannelType;
	}[];
	onChange: (channel: {
		name: string;
		id: string;
	}) => void;
	selectedChannel: {
		name: string;
		id: string;
		type: ChannelType;
	};
}) {
	const [open, setOpen] = React.useState(false);
	// first forums, then announcements, then text
	const value = props.selectedChannel;

	function getValue(channel: {
		id: string;
		name: string;
	}) {
		return `${channel.name}-${channel.id}`;
	}

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					role="combobox"
					aria-expanded={open}
					className="w-[200px] justify-between"
				>
					{props.selectedChannel ? (
						<div className="flex items-center gap-2">
							<ChannelIcon
								className="size-4"
								type={props.selectedChannel.type}
							/>
							{props.selectedChannel.name}
						</div>
					) : (
						'Select channel...'
					)}
					<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-[200px] p-0">
				<Command>
					<CommandInput placeholder="Search channels..." />
					<CommandList>
						<CommandEmpty>No channel found.</CommandEmpty>
						<CommandGroup>
							{props.values.map((channel) => (
								<CommandItem
									key={channel.id}
									value={getValue(channel)}
									onSelect={(currentValue) => {
										// setValue(currentValue === value ? '' : currentValue);
										setOpen(false);
										props.onChange(channel);
									}}
								>
									<Check
										className={cn(
											'mr-2 h-4 w-4',
											value && getValue(channel) === getValue(value)
												? 'opacity-100'
												: 'opacity-0',
										)}
									/>
									<ChannelIcon className="size-4 mr-2" type={channel.type} />
									{channel.name}
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}

interface ToggleChannelFlagProps {
	title: React.ReactNode;
	description: React.ReactNode;
	flagKey: keyof ChannelWithFlags['flags'];
	label: React.ReactNode;
	disabled?: boolean;
	disabledReason?: React.ReactNode;
	selectedChannel: ChannelWithFlags;
}

function SettingsCard({
	children,
	title,
	description,
	disabled,
	disabledReason,
}: {
	children: React.ReactNode;
	title: React.ReactNode;
	description: React.ReactNode;
	disabled?: boolean;
	disabledReason?: React.ReactNode;
}) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>{title}</CardTitle>
				<CardDescription>{description}</CardDescription>
			</CardHeader>
			<CardContent className={cn(disabled && 'cursor-not-allowed opacity-50')}>
				{children}
			</CardContent>
			{disabled && (
				<CardFooter className="text-muted-foreground border-t-2 pt-2">
					{disabledReason}
				</CardFooter>
			)}
		</Card>
	);
}

function ToggleChannelFlag({
	title,
	description,
	flagKey,
	label,
	disabled = false,
	disabledReason,
	selectedChannel,
}: ToggleChannelFlagProps) {
	const updateMutation = trpc.channels.update.useMutation({
		onError: (error) => {
			toast.error(error.message);
		},
	});
	const utils = trpc.useUtils();

	return (
		<SettingsCard
			title={title}
			description={description}
			disabled={disabled}
			disabledReason={disabledReason}
		>
			<div className="flex items-center gap-2 pt-0">
				<Switch
					onCheckedChange={async (checked) => {
						if (disabled) return;
						const existing = utils.dashboard.fetchDashboardById.getData(
							selectedChannel.serverId,
						);
						if (existing) {
							const updated = {
								...existing,
								channels: existing.channels.map((c) =>
									c.id === selectedChannel.id
										? {
												...c,
												flags: {
													...c.flags,
													[flagKey]: checked,
												},
											}
										: c,
								),
							};
							utils.dashboard.fetchDashboardById.setData(
								selectedChannel.serverId,
								updated,
							);
						}
						await updateMutation.mutateAsync({
							id: selectedChannel.id,
							flags: {
								[flagKey]: checked,
							},
						});
						await utils.dashboard.fetchDashboardById.invalidate();
					}}
					checked={selectedChannel.flags[flagKey]}
					disabled={disabled}
				/>
				<Label>{label}</Label>
			</div>
		</SettingsCard>
	);
}

function ChooseSolvedTagCard(props: { selectedChannel: ChannelWithFlags }) {
	const { data: tags } = trpc.channels.getTags.useQuery(
		props.selectedChannel.id,
	);
	const mutation = trpc.channels.update.useMutation({
		onError: (error) => {
			toast.error(error.message);
		},
	});
	const utils = trpc.useUtils();

	return (
		<SettingsCard
			title="Choose Solved Tag"
			description="Choose the tag that will be used to mark solutions"
			disabled={props.selectedChannel.type !== ChannelType.GuildForum}
			disabledReason="This option is only available for forum channels."
		>
			<div>
				<Select
					// setting key is a hack? to get it to rerender when clear is selected
					key={props.selectedChannel.solutionTagId}
					value={props.selectedChannel.solutionTagId ?? undefined}
					disabled={props.selectedChannel.type !== ChannelType.GuildForum}
					onValueChange={async (value) => {
						if (value === 'noop') {
							return;
						}
						const parsed = value === 'clear' ? null : value;
						const existing = utils.dashboard.fetchDashboardById.getData(
							props.selectedChannel.serverId,
						);
						if (existing) {
							utils.dashboard.fetchDashboardById.setData(
								props.selectedChannel.serverId,
								{
									...existing,
									channels: existing.channels.map((c) =>
										c.id === props.selectedChannel.id
											? {
													...c,
													solutionTagId: parsed,
												}
											: c,
									),
								},
							);
						}
						await mutation.mutateAsync({
							id: props.selectedChannel.id,
							solutionTagId: parsed,
						});
						await utils.dashboard.fetchDashboardById.invalidate();
					}}
				>
					<SelectTrigger className="max-w-[250px]">
						<SelectValue placeholder="Select a tag" />
					</SelectTrigger>
					<SelectContent>
						{tags?.tags?.length === 0 && (
							<SelectItem value="noop">(No tags found)</SelectItem>
						)}
						{props.selectedChannel.solutionTagId && (
							<SelectItem value="clear">(Clear)</SelectItem>
						)}
						{tags?.tags?.map((tag) => {
							let emoji: React.ReactNode | null = null;
							if (tag.emoji) {
								if (tag.emoji.id) {
									emoji = (
										<img
											className="size-4"
											src={`https://cdn.discordapp.com/emojis/${tag.emoji.id}.png`}
										/>
									);
								} else {
									emoji = tag.emoji.name;
								}
							}
							return (
								<SelectItem key={tag.id} value={tag.id}>
									<div className="flex items-center flex-row gap-2">
										{emoji} {tag.name}
									</div>
								</SelectItem>
							);
						})}
					</SelectContent>
				</Select>
			</div>
		</SettingsCard>
	);
}

export default function ChannelsPage() {
	const { server } = useDashboardContext();
	const [selectedChannelIndex, setSelectedChannelIndex] = React.useState(0);
	const selectedChannel = server.channels[selectedChannelIndex];
	if (!selectedChannel) {
		return null;
	}
	return (
		<div className="flex flex-col gap-8">
			<Tabs value={'settings'} className="space-y-6 bg-background">
				<TabsList className="w-full justify-start overflow-x-auto px-0 bg-background">
					<div className="mr-4">
						<ChannelDropdown
							values={server.channels}
							selectedChannel={selectedChannel}
							onChange={(channel) =>
								setSelectedChannelIndex(
									server.channels.findIndex((c) => c.id === channel.id),
								)
							}
						/>
					</div>
					<TabsTrigger value="settings" asChild>
						<Button variant="ghost">Settings</Button>
					</TabsTrigger>
				</TabsList>
				<TabsContent value="settings" className="space-y-4">
					<ToggleChannelFlag
						flagKey="indexingEnabled"
						title="Indexing Enabled"
						description="Whether the channel is indexed"
						label="Indexing Enabled"
						selectedChannel={selectedChannel}
					/>
					<ToggleChannelFlag
						flagKey="forumGuidelinesConsentEnabled"
						title="Forum Guidelines Consent Enabled"
						disabled={selectedChannel?.type !== ChannelType.GuildForum}
						disabledReason="This option is only available for forum channels."
						description="Whether the channel requires consent to post"
						label="Enabled"
						selectedChannel={selectedChannel}
					/>
					<ToggleChannelFlag
						flagKey="markSolutionEnabled"
						title="Mark Solution Enabled"
						description="Whether the channel allows marking solutions"
						label="Enabled"
						selectedChannel={selectedChannel}
					/>
					<ToggleChannelFlag
						flagKey="sendMarkSolutionInstructionsInNewThreads"
						title="Send Mark Solution Instructions in New Threads"
						description="Whether to send mark solution instructions in new threads"
						label="Enabled"
						disabled={!selectedChannel.flags.markSolutionEnabled}
						disabledReason="This option is only available if mark solution is enabled."
						selectedChannel={selectedChannel}
					/>
					<ToggleChannelFlag
						flagKey="autoThreadEnabled"
						title="Auto Thread Enabled"
						description="Whether the channel allows auto-threading"
						label="Enabled"
						disabled={selectedChannel?.type !== ChannelType.GuildText}
						disabledReason="This option is only available for text channels."
						selectedChannel={selectedChannel}
					/>
					<ChooseSolvedTagCard selectedChannel={selectedChannel} />
				</TabsContent>
				<TabsContent value="threads"></TabsContent>
				<TabsContent value="analytics"></TabsContent>
			</Tabs>
		</div>
	);
}
