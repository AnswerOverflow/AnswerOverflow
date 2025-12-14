"use client";
import { LinkButton } from "./link-button";

export const PricingOptions = () => {
	return (
		<div className="my-6 max-w-6xl sm:mx-3 md:mx-auto">
			<h1 className="text-center">Plans</h1>
			<div className="mx-auto my-8 grid w-full grid-cols-1 justify-items-center gap-8">
				<LinkButton href="/dashboard/onboarding">Get Started</LinkButton>
			</div>
		</div>
	);
};
