"use client";

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
import { useSession } from "@packages/ui/components/convex-client-provider";
import { DNSCopyButton } from "@packages/ui/components/dns-table";
import { Input } from "@packages/ui/components/input";
import { Label } from "@packages/ui/components/label";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useAuthClient } from "../../../../lib/auth-client";

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
