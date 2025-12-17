"use client";

import { api } from "@packages/database/convex/_generated/api";
import { useQuery } from "convex/react";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "../avatar";
import { Button } from "../button";
import { useAuthClient } from "../convex-client-provider";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "../dialog";
import { Input } from "../input";
import { Label } from "../label";

type LookedUpUser = {
	userId: string;
	name: string;
	email: string;
	image: string | null;
};

function getInitials(name: string) {
	return name
		.split(" ")
		.map((n) => n[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);
}

export function ImpersonateDialog({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const authClient = useAuthClient();
	const [identifier, setIdentifier] = useState("");
	const [lookupIdentifier, setLookupIdentifier] = useState<string | null>(null);
	const [isImpersonating, setIsImpersonating] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const lookedUpUser = useQuery(
		api.authenticated.admin.lookupUserForImpersonation,
		lookupIdentifier ? { identifier: lookupIdentifier } : "skip",
	);

	const handleLookup = () => {
		if (!identifier.trim()) {
			setError("Please enter an email or Discord ID");
			return;
		}
		setError(null);
		setLookupIdentifier(identifier.trim());
	};

	const handleImpersonate = async (user: LookedUpUser) => {
		setIsImpersonating(true);
		setError(null);
		try {
			await authClient.admin.impersonateUser({ userId: user.userId });
			onOpenChange(false);
			window.location.reload();
		} catch (e) {
			setError(e instanceof Error ? e.message : "Failed to impersonate user");
			setIsImpersonating(false);
		}
	};

	const handleClose = () => {
		setIdentifier("");
		setLookupIdentifier(null);
		setError(null);
		setIsImpersonating(false);
		onOpenChange(false);
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") {
			handleLookup();
		}
	};

	const showNotFound = Boolean(lookupIdentifier && lookedUpUser === null);
	const isLoading = Boolean(lookupIdentifier && lookedUpUser === undefined);

	return (
		<Dialog open={open} onOpenChange={handleClose}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Impersonate User</DialogTitle>
					<DialogDescription>
						Enter an email address or Discord ID to find and impersonate a user.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="identifier">Email or Discord ID</Label>
						<div className="flex gap-2">
							<Input
								id="identifier"
								placeholder="user@example.com or 523949187663134754"
								value={identifier}
								onChange={(e) => setIdentifier(e.target.value)}
								onKeyDown={handleKeyDown}
								disabled={isImpersonating}
							/>
							<Button
								type="button"
								onClick={handleLookup}
								disabled={isImpersonating || Boolean(isLoading)}
								variant="outline"
							>
								{isLoading ? "..." : "Lookup"}
							</Button>
						</div>
					</div>

					{error && (
						<div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
							{error}
						</div>
					)}

					{showNotFound && (
						<div className="text-sm text-muted-foreground bg-muted px-3 py-2 rounded-md">
							No user found. Make sure they have logged in with Discord OAuth.
						</div>
					)}

					{lookedUpUser && (
						<div className="border rounded-lg p-4 space-y-4">
							<div className="flex items-center gap-3">
								<Avatar className="size-12">
									<AvatarImage
										src={lookedUpUser.image ?? undefined}
										alt={lookedUpUser.name}
									/>
									<AvatarFallback>
										{getInitials(lookedUpUser.name)}
									</AvatarFallback>
								</Avatar>
								<div>
									<div className="font-medium">{lookedUpUser.name}</div>
									<div className="text-sm text-muted-foreground">
										{lookedUpUser.email}
									</div>
								</div>
							</div>

							<Button
								onClick={() => handleImpersonate(lookedUpUser)}
								disabled={isImpersonating}
								className="w-full"
							>
								{isImpersonating ? "Starting session..." : "Impersonate User"}
							</Button>
						</div>
					)}
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={handleClose}>
						Cancel
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
