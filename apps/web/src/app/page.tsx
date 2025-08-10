"use client";

import { Button } from "@packages/ui/components/button";
import { useMutation, useQuery } from "convex/react";
import { api } from "@packages/convex/convex/_generated/api";

export default function Home() {
	const entries = useQuery(api.functions.getEntries);
	const createEntry = useMutation(api.functions.createEntry);
	const removeEntry = useMutation(api.functions.removeEntry);
	return (
		<main className="max-w-4xl mx-auto p-8">
			<div className="space-y-4 mb-8">
				{entries?.map((entry) => (
					<div
						key={entry._id}
						className="p-4 rounded-lg bg-gray-100 dark:bg-gray-800 flex justify-between items-center"
					>
						<span>{entry.name}</span>
						<button
							onClick={() => removeEntry({ id: entry._id })}
							className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
						>
							✕
						</button>
					</div>
				))}
			</div>
			<Button
				onClick={() =>
					createEntry({
						content:
							// random string
							Math.random()
								.toString(36)
								.substring(2, 15),
					})
				}
				className="w-full sm:w-auto"
			>
				Click me
			</Button>
		</main>
	);
}
