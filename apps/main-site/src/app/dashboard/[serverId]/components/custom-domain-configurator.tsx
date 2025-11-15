"use client";

import { api } from "@packages/database/convex/_generated/api";
import type { Id } from "@packages/database/convex/_generated/dataModel";
import { Button } from "@packages/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@packages/ui/components/card";
import { Input } from "@packages/ui/components/input";
import { useMutation, useQuery } from "convex/react";
import { LoaderCircle } from "lucide-react";
import { useState } from "react";

export function CustomDomainConfigurator({
	serverId,
}: {
	serverId: Id<"servers">;
}) {
	const [_domain, setDomain] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const dashboardData = useQuery(
		api.public.dashboard_queries.getDashboardData,
		{
			serverId,
		},
	);

	const updateCustomDomain = useMutation(
		api.public.dashboard_mutations.updateCustomDomain,
	);

	const currentDomain = dashboardData?.server.customDomain ?? null;

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setIsSubmitting(true);

		try {
			const formData = new FormData(e.currentTarget);
			const newDomain = (formData.get("customDomain") as string) || null;

			await updateCustomDomain({
				serverId,
				customDomain: newDomain === "" ? null : newDomain,
			});

			setDomain(newDomain === "" ? null : newDomain);
		} catch (error) {
			console.error("Failed to update custom domain:", error);
			// TODO: Add toast notification for error
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Card className="flex flex-col space-y-6">
			<form onSubmit={handleSubmit}>
				<CardHeader>
					<CardTitle className="text-lg font-semibold">Custom Domain</CardTitle>
					<CardDescription>The custom domain for your site.</CardDescription>
				</CardHeader>
				<CardContent className="relative bg-background flex flex-row items-center justify-between w-full gap-4">
					<Input
						type="text"
						name="customDomain"
						placeholder="example.com"
						maxLength={64}
						className="max-w-sm bg-background"
						defaultValue={currentDomain ?? ""}
					/>
					<Button type="submit" variant="outline" disabled={isSubmitting}>
						{isSubmitting ? <LoaderCircle className="animate-spin" /> : "Save"}
					</Button>
				</CardContent>
				{/* TODO: Add DomainStatus and DomainConfiguration components when domain verification is implemented */}
			</form>
		</Card>
	);
}
