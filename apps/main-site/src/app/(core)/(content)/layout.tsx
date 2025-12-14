import type React from "react";

export default function ContentLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className="container mx-auto max-w-4xl px-4 py-10 prose dark:prose-invert">
			{children}
		</div>
	);
}
