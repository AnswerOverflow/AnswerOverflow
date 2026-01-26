"use client";

import { Button } from "@packages/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@packages/ui/components/dialog";
import { Switch } from "@packages/ui/components/switch";
import { DiscordIcon } from "@packages/ui/icons/index";
import { getDiscordDeepLink } from "@packages/ui/utils/discord";
import { ExternalLink, Globe } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "ao-discord-open-preference";

type DiscordOpenPreference = "browser" | "app";

function getSavedPreference(): DiscordOpenPreference | null {
	if (typeof window === "undefined") return null;
	const value = localStorage.getItem(STORAGE_KEY);
	if (value === "browser" || value === "app") return value;
	return null;
}

function savePreference(preference: DiscordOpenPreference) {
	localStorage.setItem(STORAGE_KEY, preference);
}

function clearPreference() {
	localStorage.removeItem(STORAGE_KEY);
}

type OpenInDiscordModalProps = {
	discordUrl: string;
};

export function OpenInDiscordLink({ discordUrl }: OpenInDiscordModalProps) {
	const [open, setOpen] = useState(false);
	const [rememberChoice, setRememberChoice] = useState(false);
	const deepLink = getDiscordDeepLink(discordUrl);

	// Check if there's a saved preference and navigate directly
	const handleClick = useCallback(
		(e: React.MouseEvent) => {
			const saved = getSavedPreference();
			if (saved === "browser") {
				// Let the default link behavior happen via window.open
				e.preventDefault();
				window.open(discordUrl, "_blank", "noopener,noreferrer");
				return;
			}
			if (saved === "app") {
				e.preventDefault();
				window.location.href = deepLink;
				return;
			}
			// No saved preference — show the modal
			e.preventDefault();
			setOpen(true);
		},
		[discordUrl, deepLink],
	);

	// Sync the remember toggle with localStorage on open
	useEffect(() => {
		if (open) {
			setRememberChoice(getSavedPreference() !== null);
		}
	}, [open]);

	const handleOpenBrowser = () => {
		if (rememberChoice) savePreference("browser");
		else clearPreference();
		setOpen(false);
		window.open(discordUrl, "_blank", "noopener,noreferrer");
	};

	const handleOpenApp = () => {
		if (rememberChoice) savePreference("app");
		else clearPreference();
		setOpen(false);
		window.location.href = deepLink;
	};

	return (
		<>
			<button
				type="button"
				onClick={handleClick}
				className="flex flex-row-reverse items-center gap-1 text-sm font-semibold hover:underline"
			>
				<ExternalLink size={16} />
				View on Discord
			</button>

			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className="sm:max-w-sm">
					<DialogHeader>
						<DialogTitle>Open in Discord</DialogTitle>
						<DialogDescription>
							Choose how you want to view this conversation
						</DialogDescription>
					</DialogHeader>
					<div className="flex flex-col gap-3">
						<Button
							variant="outline"
							className="w-full justify-start gap-3 h-12"
							onClick={handleOpenBrowser}
						>
							<Globe className="size-5 shrink-0" />
							Open in your browser
						</Button>
						<Button
							className="w-full justify-start gap-3 h-12 bg-[#5865F2] hover:bg-[#4752C4] text-white"
							onClick={handleOpenApp}
						>
							<DiscordIcon className="size-5 shrink-0" />
							Open in the Discord app
						</Button>
					</div>
					<label className="flex items-center gap-2 pt-2 cursor-pointer">
						<Switch
							checked={rememberChoice}
							onCheckedChange={setRememberChoice}
						/>
						<span className="text-sm text-muted-foreground">
							Remember my choice
						</span>
					</label>
				</DialogContent>
			</Dialog>
		</>
	);
}
