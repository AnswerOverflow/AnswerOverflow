"use client";

import { PermissionFlagsBits } from "discord-api-types/v10";
import { AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "./alert";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "./card";

export interface BotPermissionStatus {
	status: "good" | "warning" | "error";
	missingPermissions: string[];
	hasPermissions: string[];
}

const REQUIRED_PERMISSIONS = ["ViewChannel", "ReadMessageHistory"] as const;

const IMPORTANT_PERMISSIONS = [
	"SendMessages",
	"SendMessagesInThreads",
	"CreatePublicThreads",
	"ManageThreads",
	"EmbedLinks",
	"AddReactions",
] as const;

const PERMISSION_FLAG_MAP: Record<string, keyof typeof PermissionFlagsBits> = {
	ViewChannel: "ViewChannel",
	ReadMessageHistory: "ReadMessageHistory",
	SendMessages: "SendMessages",
	SendMessagesInThreads: "SendMessagesInThreads",
	CreatePublicThreads: "CreatePublicThreads",
	ManageThreads: "ManageThreads",
	EmbedLinks: "EmbedLinks",
	AddReactions: "AddReactions",
	CreateInstantInvite: "CreateInstantInvite",
	UseApplicationCommands: "UseApplicationCommands",
};

const PERMISSION_NAMES: Record<string, string> = {
	ViewChannel: "View Channels",
	ReadMessageHistory: "Read Message History",
	SendMessages: "Send Messages",
	SendMessagesInThreads: "Send Messages in Threads",
	CreatePublicThreads: "Create Public Threads",
	ManageThreads: "Manage Threads",
	EmbedLinks: "Embed Links",
	AddReactions: "Add Reactions",
	CreateInstantInvite: "Create Invite",
	UseApplicationCommands: "Use Application Commands",
};

function checkPermissions(
	botPermissions: string | null | undefined,
): BotPermissionStatus {
	if (!botPermissions) {
		return {
			status: "error",
			missingPermissions: [...REQUIRED_PERMISSIONS, ...IMPORTANT_PERMISSIONS],
			hasPermissions: [],
		};
	}

	const permissionsBigInt = BigInt(botPermissions);
	const hasPermission = (flag: bigint) => (permissionsBigInt & flag) === flag;

	const missingRequired: string[] = [];
	const missingImportant: string[] = [];
	const hasPermissions: string[] = [];

	for (const perm of REQUIRED_PERMISSIONS) {
		const flagKey = PERMISSION_FLAG_MAP[perm];
		if (!flagKey) {
			console.warn(`Unknown permission: ${perm}`);
			continue;
		}
		const flagValue = PermissionFlagsBits[flagKey];
		if (flagValue === undefined) {
			console.warn(`Permission flag not found: ${flagKey}`);
			continue;
		}
		const flag = BigInt(flagValue);
		if (hasPermission(flag)) {
			hasPermissions.push(perm);
		} else {
			missingRequired.push(perm);
		}
	}

	for (const perm of IMPORTANT_PERMISSIONS) {
		const flagKey = PERMISSION_FLAG_MAP[perm];
		if (!flagKey) {
			console.warn(`Unknown permission: ${perm}`);
			continue;
		}
		const flagValue = PermissionFlagsBits[flagKey];
		if (flagValue === undefined) {
			console.warn(`Permission flag not found: ${flagKey}`);
			continue;
		}
		const flag = BigInt(flagValue);
		if (hasPermission(flag)) {
			hasPermissions.push(perm);
		} else {
			missingImportant.push(perm);
		}
	}

	if (missingRequired.length > 0) {
		return {
			status: "error",
			missingPermissions: [...missingRequired, ...missingImportant],
			hasPermissions,
		};
	}

	if (missingImportant.length > 0) {
		return {
			status: "warning",
			missingPermissions: missingImportant,
			hasPermissions,
		};
	}

	return {
		status: "good",
		missingPermissions: [],
		hasPermissions: [...hasPermissions],
	};
}

export function ChannelBotPermissionsStatus({
	botPermissions,
	channelName,
}: {
	botPermissions: string | null | undefined;
	channelName: string;
}) {
	const status = checkPermissions(botPermissions);
	if (status.status === "good") {
		return (
			<Card>
				<CardHeader>
					<div className="flex items-center gap-2">
						<CheckCircle2 className="h-5 w-5 text-green-600" />
						<CardTitle>Bot Permissions</CardTitle>
					</div>
					<CardDescription>
						All required permissions are configured correctly for {channelName}
					</CardDescription>
				</CardHeader>
			</Card>
		);
	}

	const isError = status.status === "error";
	const Icon = isError ? XCircle : AlertCircle;
	const colorClass = isError ? "text-red-600" : "text-yellow-600";
	const description = isError
		? `The bot is missing required permissions in ${channelName}. Some features may not work correctly.`
		: `The bot is missing some recommended permissions in ${channelName}. Some features may be limited.`;

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center gap-2">
					<Icon className={`h-5 w-5 ${colorClass}`} />
					<CardTitle>Bot Permissions</CardTitle>
				</div>
				<CardDescription>{description}</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<div>
					<h4 className="text-sm font-medium mb-2">Missing Permissions:</h4>
					<ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
						{status.missingPermissions.map((perm) => (
							<li key={perm}>{PERMISSION_NAMES[perm] ?? perm}</li>
						))}
					</ul>
				</div>
				<Alert>
					<AlertTitle>How to Fix</AlertTitle>
					<AlertDescription className="space-y-2">
						<ol className="list-decimal list-inside space-y-1 text-sm">
							<li>Right-click on the channel {channelName} in Discord</li>
							<li>Select "Edit Channel"</li>
							<li>Go to the "Permissions" tab</li>
							<li>
								Find the Answer Overflow bot role or user in the permissions
								list
							</li>
							<li>Enable the missing permissions listed above</li>
							<li>
								Save the changes. The permissions will sync automatically.
							</li>
						</ol>
					</AlertDescription>
				</Alert>
			</CardContent>
		</Card>
	);
}
