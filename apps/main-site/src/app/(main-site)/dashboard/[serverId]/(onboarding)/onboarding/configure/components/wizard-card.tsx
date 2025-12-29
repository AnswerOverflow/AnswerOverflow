"use client";

import { Card, CardContent } from "@packages/ui/components/card";

type WizardCardProps = {
	children: React.ReactNode;
};

export function WizardCard({ children }: WizardCardProps) {
	return (
		<Card className="p-0">
			<CardContent className="px-3 pb-0 pt-4 sm:px-6">{children}</CardContent>
		</Card>
	);
}
