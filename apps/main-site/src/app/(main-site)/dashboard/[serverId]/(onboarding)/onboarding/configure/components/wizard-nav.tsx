"use client";

import { Button } from "@packages/ui/components/button";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
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
		if (skipHref) {
			router.push(skipHref);
		} else if (nextHref) {
			router.push(nextHref);
		}
	};

	return (
		<div className="flex items-center justify-between pt-3 sm:pt-4 mt-auto">
			<div>
				{backHref && (
					<Button variant="ghost" onClick={() => router.push(backHref)}>
						<ArrowLeft className="h-4 w-4 mr-1 sm:mr-2" />
						<span className="hidden sm:inline">Back</span>
					</Button>
				)}
			</div>
			<div className="flex items-center gap-1 sm:gap-2">
				{showSkip && (
					<Button variant="ghost" onClick={handleSkip}>
						Skip
					</Button>
				)}
				<Button onClick={handleNext} disabled={isNextDisabled || isLoading}>
					{isLoading ? (
						<>
							<Loader2 className="h-4 w-4 mr-1 sm:mr-2 animate-spin" />
							<span className="hidden sm:inline">Please wait...</span>
						</>
					) : (
						<>
							{nextLabel}
							{nextHref && <ArrowRight className="h-4 w-4 ml-1 sm:ml-2" />}
						</>
					)}
				</Button>
			</div>
		</div>
	);
}
