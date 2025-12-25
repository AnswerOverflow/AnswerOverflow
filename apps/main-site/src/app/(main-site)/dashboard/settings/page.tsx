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
import { Input } from "@packages/ui/components/input";
import { Skeleton } from "@packages/ui/components/skeleton";
import { Copy, Key, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
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
	const { data: session, isPending: sessionPending } = useSession({
		allowAnonymous: false,
	});

	const [apiKey, setApiKey] = useState<ApiKeyData | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
	const [isCreating, setIsCreating] = useState(false);
	const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);

	const fetchApiKeys = useCallback(async () => {
		try {
			const result = await authClient.apiKey.list();
			const firstKey = result.data?.[0];
			if (firstKey) {
				setApiKey({
					id: firstKey.id,
					start: firstKey.start ?? null,
					prefix: firstKey.prefix ?? null,
					createdAt: new Date(firstKey.createdAt),
				});
			} else {
				setApiKey(null);
			}
		} catch {
			setApiKey(null);
		} finally {
			setIsLoading(false);
		}
	}, [authClient.apiKey]);

	useEffect(() => {
		if (session?.user) {
			fetchApiKeys();
		}
	}, [session?.user, fetchApiKeys]);

	const handleCreateKey = async () => {
		setIsCreating(true);
		try {
			const result = await authClient.apiKey.create({});
			if (result.data?.key) {
				setNewlyCreatedKey(result.data.key);
				setApiKey({
					id: result.data.id,
					start: result.data.start ?? null,
					prefix: result.data.prefix ?? null,
					createdAt: new Date(result.data.createdAt),
				});
				toast.success("API key created");
			} else if (result.error) {
				toast.error(result.error.message ?? "Failed to create API key");
			}
		} catch {
			toast.error("Failed to create API key");
		} finally {
			setIsCreating(false);
		}
	};

	const handleRegenerateKey = async () => {
		if (!apiKey) return;

		setIsCreating(true);
		try {
			await authClient.apiKey.delete({ keyId: apiKey.id });
			const result = await authClient.apiKey.create({});
			if (result.data?.key) {
				setNewlyCreatedKey(result.data.key);
				setApiKey({
					id: result.data.id,
					start: result.data.start ?? null,
					prefix: result.data.prefix ?? null,
					createdAt: new Date(result.data.createdAt),
				});
				toast.success("API key regenerated");
			} else if (result.error) {
				toast.error(result.error.message ?? "Failed to regenerate API key");
			}
		} catch {
			toast.error("Failed to regenerate API key");
		} finally {
			setIsCreating(false);
			setShowRegenerateDialog(false);
		}
	};

	const copyToClipboard = async (text: string) => {
		await navigator.clipboard.writeText(text);
		toast.success("Copied to clipboard");
	};

	const getMaskedKey = () => {
		if (!apiKey) return "";
		const prefix = apiKey.prefix ?? "";
		const start = apiKey.start ?? "";
		return `${prefix}${start}${"•".repeat(20)}`;
	};

	if (sessionPending) {
		return (
			<main className="max-w-2xl mx-auto p-8">
				<h1 className="text-3xl font-bold mb-6">Settings</h1>
				<Card>
					<CardHeader>
						<Skeleton className="h-6 w-32" />
						<Skeleton className="h-4 w-64 mt-2" />
					</CardHeader>
					<CardContent>
						<Skeleton className="h-10 w-full" />
					</CardContent>
				</Card>
			</main>
		);
	}

	if (!session?.user) {
		router.push("/dashboard");
		return null;
	}

	return (
		<main className="max-w-2xl mx-auto p-8">
			<h1 className="text-3xl font-bold mb-6">Settings</h1>

			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Key className="h-5 w-5" />
						API Key
					</CardTitle>
					<CardDescription>
						Use this key to authenticate API requests. Include it in the{" "}
						<code className="bg-muted px-1 py-0.5 rounded text-sm">
							x-api-key
						</code>{" "}
						header.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					{isLoading ? (
						<Skeleton className="h-10 w-full" />
					) : newlyCreatedKey ? (
						<div className="space-y-4">
							<div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
								<p className="text-sm text-amber-600 dark:text-amber-400 font-medium mb-2">
									Copy your API key now. You won't be able to see it again.
								</p>
								<div className="flex gap-2">
									<Input
										readOnly
										value={newlyCreatedKey}
										className="font-mono text-sm"
									/>
									<Button
										variant="outline"
										size="icon"
										onClick={() => copyToClipboard(newlyCreatedKey)}
									>
										<Copy className="h-4 w-4" />
									</Button>
								</div>
							</div>
							<Button
								variant="secondary"
								onClick={() => setNewlyCreatedKey(null)}
							>
								Done
							</Button>
						</div>
					) : apiKey ? (
						<div className="space-y-4">
							<div className="flex gap-2">
								<Input
									readOnly
									value={getMaskedKey()}
									className="font-mono text-sm"
								/>
								<Button
									variant="outline"
									size="icon"
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
						<Button onClick={handleCreateKey} disabled={isCreating}>
							{isCreating ? (
								<>
									<RefreshCw className="h-4 w-4 mr-2 animate-spin" />
									Creating...
								</>
							) : (
								<>
									<Key className="h-4 w-4 mr-2" />
									Generate API Key
								</>
							)}
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
							onClick={handleRegenerateKey}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							Regenerate
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</main>
	);
}
