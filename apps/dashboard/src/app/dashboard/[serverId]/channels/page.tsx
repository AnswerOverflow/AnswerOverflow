'use client';

import { ChannelWithFlags } from '@answeroverflow/core/zod';
import { Button } from '@answeroverflow/ui/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
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
import { Check, ChevronsUpDown } from 'lucide-react';
import * as React from 'react';
import { toast } from 'react-toastify';
import { useDashboardContext } from '../components/dashboard-context';
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@answeroverflow/ui/ui/tooltip';
import { ChannelType } from 'discord-api-types/v10';

export function ChannelDropdown(props: {
	values: {
		name: string;
		id: string;
	}[];
	onChange: (channel: {
		name: string;
		id: string;
	}) => void;
	selectedChannel: {
		name: string;
		id: string;
	};
}) {
	const [open, setOpen] = React.useState(false);
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
					{value
						? props.values.find(
								(channel) => getValue(channel) === getValue(value),
							)?.name
						: 'Select channel...'}
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

	const toggleSwitch = (
		<div className="flex items-center gap-2 pt-0">
			<Switch
				onCheckedChange={async (checked) => {
					if (disabled) return;
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
	);

	return (
		<Card>
			<CardHeader>
				<CardTitle>{title}</CardTitle>
				<CardDescription>{description}</CardDescription>
			</CardHeader>
			<CardContent>
				{disabled ? (
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<div className="flex items-center gap-2 pt-0 relative">
									{toggleSwitch}
								</div>
							</TooltipTrigger>
							<TooltipContent>
								<p>{disabledReason}</p>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				) : (
					toggleSwitch
				)}
			</CardContent>
		</Card>
	);
}

export default function ChannelsPage() {
	const { server } = useDashboardContext();
	const [selectedChannel, setSelectedChannel] = React.useState(
		server.channels[0],
	);
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
								setSelectedChannel(
									server.channels.find((c) => c.id === channel.id)!,
								)
							}
						/>
					</div>
					<TabsTrigger value="settings" asChild>
						<Button variant="ghost">Settings</Button>
					</TabsTrigger>
					{/* <TabsTrigger value="threads" disabled>
						<Button variant="ghost" className="cursor-not-allowed">
							Threads
						</Button>
					</TabsTrigger>
					<TabsTrigger value="analytics" disabled>
						<Button variant="ghost" className="cursor-not-allowed">
							Analytics
						</Button>
					</TabsTrigger> */}
				</TabsList>

				{/* Settings Tab */}
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
						flagKey="autoThreadEnabled"
						title="Auto Thread Enabled"
						description="Whether the channel allows auto-threading"
						label="Enabled"
						selectedChannel={selectedChannel}
					/>
				</TabsContent>

				{/* Threads Tab */}
				<TabsContent value="threads"></TabsContent>

				{/* Analytics Tab */}
				<TabsContent value="analytics"></TabsContent>
			</Tabs>
		</div>
	);
}
