"use client";

import { buttonVariants } from "@packages/ui/components/button";
import { Link } from "@packages/ui/components/link";
import { cn } from "@packages/ui/lib/utils";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

export function CrawlablePaginationNav({
	firstPageHref,
	nextPageHref,
	className,
}: {
	firstPageHref?: string;
	nextPageHref?: string;
	className?: string;
}) {
	if (!firstPageHref && !nextPageHref) {
		return null;
	}

	return (
		<nav
			aria-label="Pagination"
			className={cn("mt-8 flex justify-center", className)}
		>
			<div className="flex flex-wrap items-center justify-center gap-2">
				{firstPageHref && (
					<Link
						href={firstPageHref}
						className={cn(
							buttonVariants({ variant: "outline", size: "default" }),
							"gap-1",
						)}
					>
						<ChevronLeftIcon className="size-4" />
						<span>First page</span>
					</Link>
				)}
				{nextPageHref && (
					<Link
						href={nextPageHref}
						className={cn(
							buttonVariants({ variant: "outline", size: "default" }),
							"gap-1",
						)}
					>
						<span>Next page</span>
						<ChevronRightIcon className="size-4" />
					</Link>
				)}
			</div>
		</nav>
	);
}
