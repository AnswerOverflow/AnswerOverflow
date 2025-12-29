"use client";

import { Card, CardContent } from "@packages/ui/components/card";
import { cn } from "@packages/ui/lib/utils";

type WizardCardProps = {
	children: React.ReactNode;
	className?: string;
};

export function WizardCard({ children, className }: WizardCardProps) {
	return (
		<Card className="p-0">
			<CardContent className={cn("p-4 sm:p-6", className)}>
				{children}
			</CardContent>
		</Card>
	);
}
