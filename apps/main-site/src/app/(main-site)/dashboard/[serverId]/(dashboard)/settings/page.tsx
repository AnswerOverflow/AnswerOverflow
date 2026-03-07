"use client";

import { api } from "@packages/database/convex/_generated/api";
import { Badge } from "@packages/ui/components/badge";
import { BlueLink } from "@packages/ui/components/blue-link";
import { BotCustomization } from "@packages/ui/components/bot-customization";
import { Button } from "@packages/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@packages/ui/components/card";
import { Checkbox } from "@packages/ui/components/checkbox";
import { CustomDomain } from "@packages/ui/components/custom-domain";
import { Input } from "@packages/ui/components/input";
import { Label } from "@packages/ui/components/label";
import { ScrollArea } from "@packages/ui/components/scroll-area";
import { Spinner } from "@packages/ui/components/spinner";
import { SponsorUrl } from "@packages/ui/components/sponsor-url";
import { Switch } from "@packages/ui/components/switch";
import { useQuery } from "@tanstack/react-query";
import { useAction, useMutation } from "convex/react";
import { Check, Search } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuthenticatedQuery } from "../../../../../../lib/use-authenticated-query";
import { TierAccessOnly } from "../components/tier-access-only";
import { CurrentPlanCard } from "./components";

function ToggleServerFlag({
	title,
	description,
	checked,
	onChange,
	disabled,
}: {
	title: React.ReactNode;
	description: React.ReactNode;
	flagKey:
		| "readTheRulesConsentEnabled"
		| "considerAllMessagesPublicEnabled"
		| "anonymizeMessagesEnabled"
		| "archiveOnMarkSolution"
		| "lockOnMarkSolution";
	checked: boolean;
	onChange: (checked: boolean) => void;
	disabled?: boolean;
}) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>{title}</CardTitle>
				<CardDescription>{description}</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="flex items-center gap-2">
					<Switch
						checked={checked}
						onCheckedChange={onChange}
						disabled={disabled}
					/>
					<Label>Enabled</Label>
				</div>
			</CardContent>
		</Card>
	);
}

function normalizeRoleIds(roleIds: readonly string[]): string[] {
	return [...new Set(roleIds)].sort();
}

function haveSameRoleIds(
	left: readonly string[],
	right: readonly string[],
): boolean {
	const normalizedLeft = normalizeRoleIds(left);
	const normalizedRight = normalizeRoleIds(right);

	if (normalizedLeft.length !== normalizedRight.length) {
		return false;
	}

	return normalizedLeft.every(
		(roleId, index) => roleId === normalizedRight[index],
	);
}

function roleColorHex(color: number): string {
	return color === 0
		? "var(--muted-foreground)"
		: `#${color.toString(16).padStart(6, "0")}`;
}

function RoleColorDot({
	color,
	size = "sm",
}: {
	color: number;
	size?: "sm" | "md";
}) {
	const sizeClass = size === "md" ? "h-3 w-3" : "h-2.5 w-2.5";
	return (
		<span
			className={`${sizeClass} rounded-full shrink-0`}
			style={{ backgroundColor: roleColorHex(color) }}
		/>
	);
}

function DashboardAccessRolesCard({
	serverId,
	selectedRoleIds,
	onSave,
	isSaving,
}: {
	serverId: string;
	selectedRoleIds: bigint[];
	onSave: (roleIds: string[]) => Promise<void>;
	isSaving: boolean;
}) {
	const getDashboardRoles = useAction(
		api.authenticated.dashboard.getDashboardRolesForServer,
	);
	const {
		data: roles,
		isLoading,
		error,
	} = useQuery({
		queryKey: ["dashboard-roles", serverId],
		queryFn: () =>
			getDashboardRoles({
				serverId: BigInt(serverId),
			}),
		enabled: !!serverId,
	});

	const savedRoleIds = normalizeRoleIds(
		selectedRoleIds.map((roleId) => roleId.toString()),
	);
	const [draftRoleIds, setDraftRoleIds] = useState<string[]>(savedRoleIds);
	const [searchQuery, setSearchQuery] = useState("");
	const [saveSuccess, setSaveSuccess] = useState(false);

	useEffect(() => {
		setDraftRoleIds(savedRoleIds);
	}, [savedRoleIds.join(",")]);

	const isDirty = !haveSameRoleIds(savedRoleIds, draftRoleIds);

	const toggleRole = (roleId: string, checked: boolean) => {
		setDraftRoleIds((currentRoleIds) =>
			normalizeRoleIds(
				checked
					? [...currentRoleIds, roleId]
					: currentRoleIds.filter((currentRoleId) => currentRoleId !== roleId),
			),
		);
	};

	const handleSave = async () => {
		await onSave(draftRoleIds);
		setSaveSuccess(true);
		setTimeout(() => setSaveSuccess(false), 2000);
	};

	const filteredRoles = useMemo(() => {
		if (!roles) return [];
		if (!searchQuery.trim()) return roles;
		const q = searchQuery.toLowerCase();
		return roles.filter((role) => role.name.toLowerCase().includes(q));
	}, [roles, searchQuery]);

	return (
		<Card>
			<CardHeader>
				<div className="space-y-1">
					<CardTitle>Dashboard Access Roles</CardTitle>
					<CardDescription>
						Grant dashboard access to specific Discord roles without giving them
						Manage Server or Administrator permissions.
					</CardDescription>
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				{isLoading ? (
					<div className="flex flex-col items-center justify-center py-8 gap-3">
						<Spinner className="h-5 w-5" />
						<span className="text-sm text-muted-foreground">
							Loading Discord roles...
						</span>
					</div>
				) : error ? (
					<div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
						Failed to load Discord roles for this server.
					</div>
				) : roles && roles.length > 0 ? (
					<div className="space-y-3">
						<div className="relative">
							<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
							<Input
								placeholder={`Search ${roles.length} roles...`}
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="pl-9"
							/>
						</div>

						<ScrollArea className="max-h-[320px] overflow-y-auto rounded-lg border">
							<div className="divide-y">
								{filteredRoles.length === 0 ? (
									<div className="flex flex-col items-center justify-center py-8 text-sm text-muted-foreground">
										<Search className="h-5 w-5 mb-2 opacity-40" />
										No roles match &ldquo;{searchQuery}&rdquo;
									</div>
								) : (
									filteredRoles.map((role) => {
										const checked = draftRoleIds.includes(role.id);

										return (
											<label
												key={role.id}
												className="flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors hover:bg-accent/50"
											>
												<Checkbox
													checked={checked}
													onCheckedChange={(value) =>
														toggleRole(role.id, value === true)
													}
												/>
												<RoleColorDot color={role.color} size="md" />
												<div className="flex min-w-0 flex-1 items-center gap-2">
													<span className="truncate text-sm font-medium">
														{role.name}
													</span>
													{role.managed && (
														<Badge
															variant="outline"
															className="text-[10px] px-1.5 py-0 h-4 shrink-0"
														>
															Managed
														</Badge>
													)}
												</div>
											</label>
										);
									})
								)}
							</div>
						</ScrollArea>

						{filteredRoles.length > 0 && searchQuery && (
							<div className="text-xs text-muted-foreground">
								Showing {filteredRoles.length} of {roles.length} roles
							</div>
						)}
					</div>
				) : (
					<div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
						No Discord roles are available for dashboard access.
					</div>
				)}

				{isDirty && (
					<div className="flex items-center justify-between rounded-lg border bg-muted/50 p-3">
						<span className="text-sm text-muted-foreground">
							Unsaved changes
						</span>
						<div className="flex items-center gap-2">
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setDraftRoleIds(savedRoleIds)}
								disabled={isSaving}
							>
								Discard
							</Button>
							<Button size="sm" onClick={handleSave} disabled={isSaving}>
								{isSaving ? (
									<>
										<Spinner className="h-3.5 w-3.5" />
										Saving...
									</>
								) : (
									"Save Changes"
								)}
							</Button>
						</div>
					</div>
				)}

				{saveSuccess && !isDirty && (
					<div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400">
						<Check className="h-4 w-4" />
						Role access saved successfully.
					</div>
				)}
			</CardContent>
		</Card>
	);
}

export default function SettingsPage() {
	const params = useParams();
	const serverId = params.serverId as string;
	const [isSavingDashboardRoles, setIsSavingDashboardRoles] = useState(false);

	const dashboardData = useAuthenticatedQuery(
		api.authenticated.dashboard_queries.getDashboardData,
		{
			serverId: BigInt(serverId),
		},
	);

	const updateServerPreferences = useMutation(
		api.authenticated.dashboard_mutations.updateServerPreferencesFlags,
	).withOptimisticUpdate((localStore, args) => {
		const currentData = localStore.getQuery(
			api.authenticated.dashboard_queries.getDashboardData,
			{ serverId: args.serverId },
		);
		if (currentData !== undefined) {
			localStore.setQuery(
				api.authenticated.dashboard_queries.getDashboardData,
				{ serverId: args.serverId },
				{
					...currentData,
					server: {
						...currentData.server,
						preferences: {
							...currentData.server.preferences,
							...args.flags,
						},
					},
				},
			);
		}
	});

	if (!dashboardData) {
		return null;
	}

	const { server } = dashboardData;
	const preferences = server.preferences;

	const handleServerToggle = async (
		flagKey:
			| "readTheRulesConsentEnabled"
			| "considerAllMessagesPublicEnabled"
			| "anonymizeMessagesEnabled"
			| "archiveOnMarkSolution"
			| "lockOnMarkSolution",
		checked: boolean,
	) => {
		try {
			await updateServerPreferences({
				serverId: BigInt(serverId),
				flags: {
					[flagKey]: checked,
				},
			});
		} catch (error) {
			console.error("Failed to update server preferences:", error);
		}
	};

	const handleDashboardRolesSave = async (roleIds: string[]) => {
		setIsSavingDashboardRoles(true);
		try {
			await updateServerPreferences({
				serverId: BigInt(serverId),
				flags: {
					dashboardRoleIds: roleIds.map((roleId) => BigInt(roleId)),
				},
			});
		} catch (error) {
			console.error("Failed to update dashboard role access:", error);
		} finally {
			setIsSavingDashboardRoles(false);
		}
	};

	return (
		<div className="flex max-w-[800px] w-full mx-auto flex-col gap-4">
			<CurrentPlanCard serverId={serverId} />
			<DashboardAccessRolesCard
				serverId={serverId}
				selectedRoleIds={preferences.dashboardRoleIds ?? []}
				onSave={handleDashboardRolesSave}
				isSaving={isSavingDashboardRoles}
			/>
			<ToggleServerFlag
				title="Consider All Messages In Indexed Channels Public"
				description={
					<>
						All messages in indexed channels will be considered public and
						displayed on the web. Learn more about{" "}
						<BlueLink
							href="/docs/user-settings/displaying-messages"
							target="_blank"
						>
							displaying messages
						</BlueLink>
						.
					</>
				}
				flagKey="considerAllMessagesPublicEnabled"
				checked={preferences.considerAllMessagesPublicEnabled ?? false}
				onChange={(checked) =>
					handleServerToggle("considerAllMessagesPublicEnabled", checked)
				}
			/>
			<ToggleServerFlag
				title="Anonymize Messages"
				description={
					<>
						Replace Discord usernames with pseudonyms. Names will randomize on
						page refresh. Can be disabled per-channel with "Forum Guidelines
						Consent Enabled" option.
					</>
				}
				flagKey="anonymizeMessagesEnabled"
				checked={preferences.anonymizeMessagesEnabled ?? false}
				onChange={(checked) =>
					handleServerToggle("anonymizeMessagesEnabled", checked)
				}
			/>
			<ToggleServerFlag
				title="Read the Rules Consent"
				description={
					<>
						Add a consent prompt to the server rules to mark new users as
						consenting to publicly display their messages.
					</>
				}
				flagKey="readTheRulesConsentEnabled"
				checked={preferences.readTheRulesConsentEnabled ?? false}
				onChange={(checked) =>
					handleServerToggle("readTheRulesConsentEnabled", checked)
				}
			/>
			<ToggleServerFlag
				title="Archive on Mark Solution"
				description={
					<>
						Automatically archive threads when a solution is marked. This helps
						keep your channels organized by closing resolved questions.
					</>
				}
				flagKey="archiveOnMarkSolution"
				checked={preferences.archiveOnMarkSolution ?? false}
				onChange={(checked) =>
					handleServerToggle("archiveOnMarkSolution", checked)
				}
			/>
			<ToggleServerFlag
				title="Lock on Mark Solution"
				description={
					<>
						Automatically lock threads when a solution is marked, preventing
						further replies. Useful for reducing necroposting on resolved
						questions.
					</>
				}
				flagKey="lockOnMarkSolution"
				checked={preferences.lockOnMarkSolution ?? false}
				onChange={(checked) =>
					handleServerToggle("lockOnMarkSolution", checked)
				}
			/>
			<SponsorUrl
				defaultUrl={preferences.sponsorUrl}
				serverId={BigInt(serverId)}
			/>
			<TierAccessOnly
				enabledFor={["PRO", "ENTERPRISE", "ADVANCED", "STARTER", "OPEN_SOURCE"]}
				serverId={serverId}
			>
				{(enabled) => (
					<CustomDomain
						className={enabled ? "" : "rounded-b-none border-b-0"}
						defaultDomain={server.customDomain ?? undefined}
						serverId={BigInt(serverId)}
					/>
				)}
			</TierAccessOnly>
			<TierAccessOnly
				enabledFor={["PRO", "ENTERPRISE", "ADVANCED", "OPEN_SOURCE"]}
				serverId={serverId}
			>
				{(enabled) => (
					<BotCustomization
						className={enabled ? "" : "rounded-b-none border-b-0"}
						serverId={BigInt(serverId)}
						data={server.botCustomization}
					/>
				)}
			</TierAccessOnly>
		</div>
	);
}
