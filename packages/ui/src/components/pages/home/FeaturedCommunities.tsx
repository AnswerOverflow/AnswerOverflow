"use client";
import { cn } from "../../../lib/utils";
import { LinkButton } from "../../link-button";

export function FeaturedCommunitiesSection(props: { className?: string }) {
	return (
		<div className={cn("overflow-x-hidden text-center", props.className)}>
			<h2>Serving 2+ million users across 300 servers</h2>
			<div className="mt-8">
				<LinkButton href="/browse">View All Communities</LinkButton>
			</div>
		</div>
	);
}
