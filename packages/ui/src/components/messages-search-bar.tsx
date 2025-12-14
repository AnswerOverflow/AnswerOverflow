"use client";

import { useQueryState } from "nuqs";
import { cn } from "../lib/utils";
import { Input } from "./input";

export interface MessagesSearchBarProps {
	placeholder?: string;
	className?: string;
	serverId?: string;
}

export function MessagesSearchBar(props: MessagesSearchBarProps) {
	const [searchQuery, setSearchQuery] = useQueryState("q");
	return (
		<Input
			value={searchQuery || ""}
			className={cn("mb-4 w-full", props.className)}
			onChange={(e) => setSearchQuery(e.target.value)}
			placeholder={props.placeholder ?? "Search"}
			type="search"
		/>
	);
}
