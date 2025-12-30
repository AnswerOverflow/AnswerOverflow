"use client";

import { Button } from "@packages/ui/components/button";
import { Card, CardContent } from "@packages/ui/components/card";
import { AlertCircle, Loader2 } from "lucide-react";
import { useWizard } from "./wizard-context";

type StepLayoutProps = {
	title: string;
	description: string;
	children: React.ReactNode;
	requiresChannels?: boolean;
	video?: React.ReactNode;
};

export function StepLayout({
	title,
	description,
	children,
	requiresChannels = true,
	video,
}: StepLayoutProps) {
	const { isLoading, error, reload } = useWizard();

	const header = (
		<div className="space-y-2">
			<h1 className="text-xl sm:text-2xl font-semibold">{title}</h1>
			<p className="text-sm sm:text-base text-muted-foreground">
				{description}
			</p>
		</div>
	);

	if (requiresChannels && isLoading) {
		return (
			<div className="w-full max-w-2xl mx-auto space-y-4 flex-1">
				{header}
				<Card className="p-0">
					<CardContent className="p-4 sm:p-6 min-h-[400px] flex items-center justify-center">
						<div className="flex flex-col items-center justify-center text-center">
							<Loader2 className="h-6 w-6 animate-spin text-muted-foreground mb-3" />
							<p className="text-sm text-muted-foreground">
								Loading your channels...
							</p>
						</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	if (error) {
		return (
			<div className="w-full max-w-2xl mx-auto space-y-4 flex-1">
				{header}
				<Card className="p-0">
					<CardContent className="p-4 sm:p-6 min-h-[400px] flex items-center justify-center">
						<div className="flex flex-col items-center justify-center text-center">
							<AlertCircle className="h-6 w-6 text-destructive mb-3" />
							<p className="text-sm text-muted-foreground mb-4">{error}</p>
							<Button onClick={reload} variant="outline" size="sm">
								Try Again
							</Button>
						</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="w-full max-w-2xl mx-auto space-y-4 flex-1">
			{header}
			{video}
			{children}
		</div>
	);
}
