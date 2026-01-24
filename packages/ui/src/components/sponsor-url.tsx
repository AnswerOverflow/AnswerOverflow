"use client";

import { api } from "@packages/database/convex/_generated/api";
import { cn } from "@packages/ui/lib/utils";
import { useMutation } from "convex/react";
import { Heart, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "./button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "./card";
import { Input } from "./input";

export type SponsorUrlProps = {
	defaultUrl?: string | null;
	serverId: bigint;
	className?: string;
};

export const SponsorUrl = (props: SponsorUrlProps) => {
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const updateServerPreferences = useMutation(
		api.authenticated.dashboard_mutations.updateServerPreferencesFlags,
	);

	return (
		<form
			className={"@container w-full"}
			onSubmit={async (event) => {
				event.preventDefault();
				setSubmitting(true);
				setError(null);
				const data = new FormData(event.currentTarget);
				const sponsorUrl = (data.get("sponsorUrl") as string).trim();

				try {
					await updateServerPreferences({
						serverId: props.serverId,
						flags: {
							sponsorUrl: sponsorUrl === "" ? null : sponsorUrl,
						},
					});
				} catch (e) {
					setError(e instanceof Error ? e.message : "Failed to update");
				}
				setSubmitting(false);
			}}
		>
			<Card className={cn("flex flex-col", props.className)}>
				<CardHeader className="relative flex flex-col text-left">
					<div className="flex items-center gap-2 relative w-full">
						<Heart className="h-5 w-5 text-pink-500" />
						<CardTitle>Sponsor Link</CardTitle>
					</div>
					<CardDescription>
						Add a link to your GitHub Sponsors, Patreon, Ko-fi, or other
						sponsorship page. This will appear in the sidebar on your community
						pages.
					</CardDescription>
				</CardHeader>
				<CardContent className="relative flex w-full @sm:flex-row flex-col items-start justify-start @sm:justify-between gap-2">
					<div className="flex-1 w-full">
						<Input
							defaultValue={props.defaultUrl ?? ""}
							maxLength={256}
							name="sponsorUrl"
							placeholder="https://github.com/sponsors/username"
							type="url"
						/>
						{error && <p className="text-sm text-destructive mt-1">{error}</p>}
					</div>
					<Button className="@sm:w-16 w-full" type="submit" variant="outline">
						{submitting ? <LoaderCircle className="animate-spin" /> : "Save"}
					</Button>
				</CardContent>
			</Card>
		</form>
	);
};
