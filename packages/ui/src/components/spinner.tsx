import { cn } from "@packages/ui/lib/utils";
import { Loader2Icon } from "lucide-react";
import * as React from "react";

const Spinner = React.forwardRef<SVGSVGElement, React.ComponentProps<"svg">>(
	({ className, ...props }, ref) => {
		return (
			<Loader2Icon
				role="status"
				aria-label="Loading"
				className={cn("size-4 animate-spin", className)}
				ref={ref}
				{...props}
			/>
		);
	},
);

Spinner.displayName = "Spinner";

export { Spinner };
