import {
	ActionRow,
	Button,
	Container,
	ModalButton,
	Separator,
	TextDisplay,
	useInstance,
} from "@packages/reacord";
import { useDeferredValue, useMemo, useState, useTransition } from "react";

interface SearchResult {
	id: string;
	title: string;
	category: string;
	relevance: number;
}

function generateResults(query: string): SearchResult[] {
	if (!query) return [];

	const categories = ["Documentation", "API", "Tutorial", "Example", "Guide"];
	const results: SearchResult[] = [];

	for (let i = 0; i < 50; i++) {
		results.push({
			id: `result-${i}`,
			title: `${query} - Result ${i + 1}`,
			category: categories[i % categories.length] ?? "Other",
			relevance: Math.max(0, 100 - i * 2 + Math.floor(Math.random() * 10)),
		});
	}

	return results.sort((a, b) => b.relevance - a.relevance);
}

interface SearchResultsProps {
	query: string;
}

function SearchResults({ query }: SearchResultsProps) {
	const results = useMemo(() => {
		let sum = 0;
		for (let i = 0; i < 10000000; i++) {
			sum += Math.sqrt(i);
		}
		void sum;
		return generateResults(query);
	}, [query]);

	if (!query) {
		return (
			<Container accentColor={0x99aab5}>
				<TextDisplay>_Enter a search query to see results_</TextDisplay>
			</Container>
		);
	}

	const topResults = results.slice(0, 5);

	return (
		<Container accentColor={0x2f3136}>
			<TextDisplay>### Search Results for "{query}"</TextDisplay>
			<TextDisplay>Found {results.length} results</TextDisplay>
			<Separator spacing="small" />
			{topResults.map((result) => (
				<TextDisplay key={result.id}>
					**{result.title}** | {result.category} | {result.relevance}% match
				</TextDisplay>
			))}
		</Container>
	);
}

export function React19DeferredScenario() {
	const instance = useInstance();
	const [query, setQuery] = useState("");
	const [isPending, startTransition] = useTransition();

	const deferredQuery = useDeferredValue(query, "");

	const isStale = query !== deferredQuery;

	const presetQueries = ["React hooks", "Discord API", "TypeScript", "Effect"];

	return (
		<>
			<Container accentColor={0x5865f2}>
				<TextDisplay>
					## React 19: useDeferredValue with initialValue
				</TextDisplay>
				<TextDisplay>
					The `useDeferredValue` hook now accepts an `initialValue` parameter.
					Search results are deferred to keep the UI responsive during expensive
					renders.
				</TextDisplay>
			</Container>

			<Container accentColor={isPending || isStale ? 0xfee75c : 0x57f287}>
				<TextDisplay>**Current query:** "{query || "_empty_"}"</TextDisplay>
				<TextDisplay>
					**Deferred query:** "{deferredQuery || "_empty_"}"
				</TextDisplay>
				<TextDisplay>
					**Status:** {isStale ? "⏳ Updating results..." : "✓ Results current"}
				</TextDisplay>
			</Container>

			<Separator />

			<SearchResults query={deferredQuery} />

			<Separator />

			<ActionRow>
				{presetQueries.map((q) => (
					<Button
						key={q}
						label={q}
						style={query === q ? "primary" : "secondary"}
						onClick={() => {
							startTransition(() => {
								setQuery(q);
							});
						}}
					/>
				))}
			</ActionRow>

			<ActionRow>
				<ModalButton
					label="Custom Search"
					style="primary"
					modalTitle="Search Query"
					fields={[
						{
							type: "textInput",
							id: "query",
							label: "Search Query",
							style: "short",
							placeholder: "Enter your search...",
							required: true,
							maxLength: 100,
							defaultValue: query,
						},
					]}
					onSubmit={(values) => {
						const newQuery = values.getTextInput("query");
						if (newQuery) {
							startTransition(() => {
								setQuery(newQuery);
							});
						}
					}}
				/>
				<Button label="Clear" style="secondary" onClick={() => setQuery("")} />
				<Button
					label="Close"
					style="danger"
					onClick={() => instance.destroy()}
				/>
			</ActionRow>
		</>
	);
}
