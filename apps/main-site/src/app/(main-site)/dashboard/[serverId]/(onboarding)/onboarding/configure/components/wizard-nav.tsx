"use client";

import { Button } from "@packages/ui/components/button";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

type WizardNavProps = {
	backHref?: string;
	nextHref?: string;
	nextLabel?: string;
	onNext?: () => void | Promise<void>;
	isNextDisabled?: boolean;
	isLoading?: boolean;
	showSkip?: boolean;
	skipHref?: string;
	onSkip?: () => void;
};

export function WizardNav({
	backHref,
	nextHref,
	nextLabel = "Continue",
	onNext,
	isNextDisabled = false,
	isLoading = false,
	showSkip = false,
	skipHref,
	onSkip,
}: WizardNavProps) {
	const router = useRouter();

	const handleNext = async () => {
		if (onNext) {
			await onNext();
		}
		if (nextHref) {
			router.push(nextHref);
		}
	};

	const handleSkip = () => {
		onSkip?.();
		if (skipHref) {
			router.push(skipHref);
		} else if (nextHref) {
			router.push(nextHref);
		}
	};

	return (
		<div className="flex items-center justify-between pt-4">
			<div>
				{backHref && (
					<Button variant="ghost" onClick={() => router.push(backHref)}>
						Back
					</Button>
				)}
			</div>
			<div className="flex items-center gap-2">
				{showSkip && (
					<Button variant="ghost" onClick={handleSkip}>
						Skip
					</Button>
				)}
				<Button onClick={handleNext} disabled={isNextDisabled || isLoading}>
					{isLoading ? (
						<>
							<Loader2 className="h-4 w-4 mr-2 animate-spin" />
							Please wait...
						</>
					) : (
						nextLabel
					)}
				</Button>
			</div>
		</div>
	);
}
