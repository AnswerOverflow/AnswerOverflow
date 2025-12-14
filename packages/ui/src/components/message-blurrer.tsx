"use client";

import type { EnrichedMessage } from "@packages/database/convex/shared/shared";

export function MessageBlurrer(props: {
	children: React.ReactNode;
	message: EnrichedMessage;
	blurCount?: number;
}) {
	const { children, blurCount = 1 } = props;
	const isPublic = true;

	if (!isPublic) {
		const blurAmount = ".4rem";
		return (
			<div className="relative w-full text-primary">
				<div
					style={{
						filter: `blur(${blurAmount})`,
						backdropFilter: `blur(${blurAmount})`,
						WebkitBackdropFilter: `blur(${blurAmount})`,
						WebkitFilter: `blur(${blurAmount})`,
						msFilter: `blur(${blurAmount})`,
					}}
					className="select-none"
					tabIndex={-1}
				>
					{children}
				</div>
				<div>
					<div className="absolute inset-0" />
					<div className="absolute inset-0 flex items-center justify-center">
						<div className="flex flex-col items-center justify-center rounded-lg text-center backdrop-blur-sm">
							<div className="text-2xl">
								{blurCount > 1
									? `${blurCount} Messages Not Public`
									: "Message Not Public"}
							</div>
							<div>Sign In & Join Server To View</div>
						</div>
					</div>
				</div>
			</div>
		);
	}

	return <>{children}</>;
}
