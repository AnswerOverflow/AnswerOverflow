"use client";

import { api } from "@packages/database/convex/_generated/api";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@packages/ui/components/alert-dialog";
import { Button } from "@packages/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@packages/ui/components/card";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@packages/ui/components/command";
import { useSession } from "@packages/ui/components/convex-client-provider";
import { DNSCopyButton } from "@packages/ui/components/dns-table";
import { Input } from "@packages/ui/components/input";
import { Label } from "@packages/ui/components/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@packages/ui/components/popover";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAction, useQuery as useConvexQuery } from "convex/react";
import {
	ChevronsUpDown,
	ExternalLink,
	Github,
	Loader2,
	Plus,
	RefreshCw,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useAuthClient } from "../../../../lib/auth-client";

type AuthClient = ReturnType<typeof useAuthClient>;

const GITHUB_APP_INSTALL_URL =
	process.env.NEXT_PUBLIC_GITHUB_APP_INSTALL_URL ??
	"https://github.com/apps/answer-overflow-dev/installations/new";

type GitHubRepo = {
	id: number;
	name: string;
	fullName: string;
	owner: string;
	private: boolean;
	installationId: number;
};

function GitHubAccountCard({ authClient }: { authClient: AuthClient }) {
	const [isLinking, setIsLinking] = useState(false);
	const [open, setOpen] = useState(false);

	const githubAccount = useConvexQuery(
		api.authenticated.github.getGitHubAccount,
		{},
	);

	const getAccessibleRepos = useAction(
		api.authenticated.github.getAccessibleRepos,
	);

	const {
		data: reposData,
		isLoading: isLoadingRepos,
		error: reposError,
	} = useQuery({
		queryKey: ["accessibleRepos", githubAccount?.isConnected],
		queryFn: async () => {
			const result = await getAccessibleRepos({});
			if (result.success) {
				return {
					repos: result.repos,
				};
			} else {
				throw new Error(result.error);
			}
		},
		enabled: !!githubAccount?.isConnected,
	});

	const repos = reposData?.repos ?? [];

	const handleLinkGitHub = async () => {
		setIsLinking(true);
		try {
			await authClient.linkSocial({
				provider: "github",
				callbackURL: window.location.pathname,
			});
		} catch (error) {
			console.error("Failed to link GitHub:", error);
			toast.error("Failed to link GitHub account");
			setIsLinking(false);
		}
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Github className="h-5 w-5" />
					GitHub Integration
				</CardTitle>
				<CardDescription>
					Link your GitHub account to create issues from Discord messages.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				{githubAccount === undefined ? (
					<div className="text-sm text-muted-foreground">Loading...</div>
				) : githubAccount === null ? (
					<div className="space-y-3">
						<p className="text-sm text-muted-foreground">
							Connect your GitHub account to enable the "Create GitHub Issue"
							command in Discord.
						</p>
						<Button onClick={handleLinkGitHub} disabled={isLinking}>
							<Github className="h-4 w-4 mr-2" />
							{isLinking ? "Connecting..." : "Connect GitHub"}
						</Button>
					</div>
				) : (
					<div className="space-y-4">
						<div className="flex items-center gap-2">
							<div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
								<Github className="h-4 w-4" />
							</div>
							<div>
								<p className="text-sm font-medium">GitHub Connected</p>
								<p className="text-xs text-muted-foreground">
									Answer Overflow can create issues on your behalf
								</p>
							</div>
						</div>

						<div className="space-y-2">
							<Label>Available Repositories</Label>
							{isLoadingRepos ? (
								<div className="flex items-center gap-2 text-sm text-muted-foreground">
									<Loader2 className="h-4 w-4 animate-spin" />
									Loading repositories...
								</div>
							) : reposError ? (
								<div className="space-y-2">
									<div className="text-sm text-destructive">
										{reposError instanceof Error
											? reposError.message
											: "Failed to load repos"}
									</div>
									<Button
										variant="outline"
										size="sm"
										onClick={handleLinkGitHub}
										disabled={isLinking}
									>
										<RefreshCw className="h-4 w-4 mr-2" />
										{isLinking ? "Reconnecting..." : "Reconnect GitHub"}
									</Button>
								</div>
							) : repos.length === 0 ? (
								<div className="space-y-2">
									<p className="text-sm text-muted-foreground">
										No repositories found. Install the Answer Overflow app on
										your repositories to get started.
									</p>
									<Button variant="outline" size="sm" asChild>
										<a
											href={GITHUB_APP_INSTALL_URL}
											target="_blank"
											rel="noopener noreferrer"
										>
											<Plus className="h-4 w-4 mr-2" />
											Install on repositories
											<ExternalLink className="h-3 w-3 ml-2" />
										</a>
									</Button>
								</div>
							) : (
								<Popover open={open} onOpenChange={setOpen}>
									<PopoverTrigger asChild>
										<Button
											variant="outline"
											role="combobox"
											aria-expanded={open}
											className="w-full justify-between font-normal"
										>
											{repos.length}{" "}
											{repos.length === 1 ? "repository" : "repositories"}{" "}
											available
											<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
										</Button>
									</PopoverTrigger>
									<PopoverContent className="w-[400px] p-0" align="start">
										<Command>
											<CommandInput placeholder="Search repositories..." />
											<CommandList>
												<CommandEmpty>No repository found.</CommandEmpty>
												<CommandGroup>
													{repos.map((repo) => (
														<CommandItem
															key={repo.id}
															value={repo.fullName}
															className="cursor-default"
														>
															<span className="font-mono text-sm">
																{repo.fullName}
															</span>
															{repo.private && (
																<span className="ml-2 text-xs text-muted-foreground">
																	(private)
																</span>
															)}
														</CommandItem>
													))}
												</CommandGroup>
											</CommandList>
										</Command>
										<div className="border-t p-2">
											<Button
												variant="ghost"
												size="sm"
												className="w-full justify-start"
												asChild
											>
												<a
													href={GITHUB_APP_INSTALL_URL}
													target="_blank"
													rel="noopener noreferrer"
												>
													<Plus className="h-4 w-4 mr-2" />
													Install on more repositories
													<ExternalLink className="h-3 w-3 ml-2" />
												</a>
											</Button>
										</div>
									</PopoverContent>
								</Popover>
							)}
						</div>

						<p className="text-xs text-muted-foreground">
							Use the "Create GitHub Issue" command in Discord to create issues
							from messages.
						</p>
					</div>
				)}
			</CardContent>
		</Card>
	);
}

type ApiKeyData = {
	id: string;
	start: string | null;
	prefix: string | null;
	createdAt: Date;
};

export default function SettingsPage() {
	const router = useRouter();
	const authClient = useAuthClient();
	const queryClient = useQueryClient();
	const { data: session, isPending: sessionPending } = useSession({
		allowAnonymous: false,
	});

	const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
	const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);

	const { data: apiKey, isLoading } = useQuery({
		queryKey: ["apiKeys"],
		queryFn: async (): Promise<ApiKeyData | null> => {
			const result = await authClient.apiKey.list();
			const firstKey = result.data?.[0];
			if (firstKey) {
				return {
					id: firstKey.id,
					start: firstKey.start ?? null,
					prefix: firstKey.prefix ?? null,
					createdAt: new Date(firstKey.createdAt),
				};
			}
			return null;
		},
		enabled: !!session?.user,
	});

	const createKeyMutation = useMutation({
		mutationFn: async () => {
			const result = await authClient.apiKey.create({});
			if (result.error) {
				throw new Error(result.error.message ?? "Failed to create API key");
			}
			return result.data;
		},
		onSuccess: (data) => {
			if (data?.key) {
				setNewlyCreatedKey(data.key);
				queryClient.invalidateQueries({ queryKey: ["apiKeys"] });
				toast.success("API key created");
			}
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});

	const regenerateKeyMutation = useMutation({
		mutationFn: async (keyId: string) => {
			await authClient.apiKey.delete({ keyId });
			const result = await authClient.apiKey.create({});
			if (result.error) {
				throw new Error(result.error.message ?? "Failed to regenerate API key");
			}
			return result.data;
		},
		onSuccess: (data) => {
			if (data?.key) {
				setNewlyCreatedKey(data.key);
				queryClient.invalidateQueries({ queryKey: ["apiKeys"] });
				toast.success("API key regenerated");
			}
			setShowRegenerateDialog(false);
		},
		onError: (error) => {
			toast.error(error.message);
			setShowRegenerateDialog(false);
		},
	});

	const isCreating =
		createKeyMutation.isPending || regenerateKeyMutation.isPending;

	const getMaskedKey = () => {
		if (!apiKey) return "";
		const start = apiKey.start ?? "";
		return `${start}${"•".repeat(20)}`;
	};

	if (sessionPending || isLoading) {
		return null;
	}

	if (!session?.user) {
		router.push("/dashboard");
		return null;
	}

	return (
		<div className="flex max-w-[800px] w-full mx-auto flex-col gap-6 px-4 py-6">
			<div>
				<h1 className="text-xl sm:text-2xl font-semibold">Account Settings</h1>
				<p className="text-sm text-muted-foreground">
					Manage your account and API access
				</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Profile</CardTitle>
					<CardDescription>
						This comes from Discord and cannot be changed.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-2">
						<Label>Email</Label>
						<Input disabled value={session.user.email} />
					</div>
					<div className="space-y-2">
						<Label>Name</Label>
						<Input disabled value={session.user.name} />
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>API Key</CardTitle>
					<CardDescription>
						Authenticate API requests with the{" "}
						<code className="bg-muted px-1 py-0.5 rounded text-sm">
							x-api-key
						</code>{" "}
						header.
					</CardDescription>
				</CardHeader>
				<CardContent>
					{newlyCreatedKey ? (
						<div className="space-y-3">
							<p className="text-sm text-muted-foreground">
								Copy your API key now. You won't be able to see it again.
							</p>
							<div className="flex gap-2">
								<Input
									readOnly
									value={newlyCreatedKey}
									className="font-mono text-xs sm:text-sm min-w-0"
								/>
								<DNSCopyButton text={newlyCreatedKey} />
							</div>
							<Button
								variant="secondary"
								size="sm"
								onClick={() => setNewlyCreatedKey(null)}
							>
								Done
							</Button>
						</div>
					) : apiKey ? (
						<div className="space-y-2">
							<div className="flex gap-2">
								<Input
									readOnly
									value={getMaskedKey()}
									className="font-mono text-xs sm:text-sm min-w-0"
								/>
								<Button
									variant="outline"
									size="icon"
									className="shrink-0"
									onClick={() => setShowRegenerateDialog(true)}
									disabled={isCreating}
								>
									<RefreshCw
										className={`h-4 w-4 ${isCreating ? "animate-spin" : ""}`}
									/>
								</Button>
							</div>
							<p className="text-xs text-muted-foreground">
								Created {apiKey.createdAt.toLocaleDateString()}
							</p>
						</div>
					) : (
						<Button
							onClick={() => createKeyMutation.mutate()}
							disabled={isCreating}
						>
							{isCreating ? "Creating..." : "Generate API Key"}
						</Button>
					)}
				</CardContent>
			</Card>

			<GitHubAccountCard authClient={authClient} />

			<AlertDialog
				open={showRegenerateDialog}
				onOpenChange={setShowRegenerateDialog}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Regenerate API Key?</AlertDialogTitle>
						<AlertDialogDescription>
							This will invalidate your current API key. Any applications using
							the old key will stop working.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => apiKey && regenerateKeyMutation.mutate(apiKey.id)}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							Regenerate
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
