"use client";

import { useRouter } from "next/navigation";
import { parseAsString, useQueryState } from "nuqs";
import { useEffect, useRef, useState } from "react";
import { cn } from "../lib/utils";
import { Input } from "./input";

export interface MessagesSearchBarProps {
	placeholder?: string;
	className?: string;
	serverId?: string;
}

export function MessagesSearchBar(props: MessagesSearchBarProps) {
	const router = useRouter();
	const [searchQuery, setSearchQuery] = useQueryState(
		"q",
		parseAsString.withDefault(""),
	);
	// Initialize from URL once, then control input independently
	const [searchInput, setSearchInput] = useState<string>(
		() => searchQuery ?? "",
	);
	const hasInitializedRef = useRef(false);
	const isUpdatingUrlRef = useRef(false);

	// Initialize from URL on mount, then only sync on external changes
	useEffect(() => {
		if (!hasInitializedRef.current) {
			hasInitializedRef.current = true;
			setSearchInput(searchQuery ?? "");
			return;
		}

		// Only sync if we're not the ones updating the URL
		if (!isUpdatingUrlRef.current) {
			setSearchInput(searchQuery ?? "");
		}
		isUpdatingUrlRef.current = false;
	}, [searchQuery]);

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value;
		const trimmedValue = value.trim() || "";
		setSearchInput(value);
		// Mark that we're updating the URL to prevent sync
		isUpdatingUrlRef.current = true;
		// Update URL immediately (no debounce)
		setSearchQuery(trimmedValue);
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		// Navigate to search page if there's a query
		if (searchInput.trim()) {
			const params = new URLSearchParams();
			params.set("q", searchInput.trim());
			const serverIdToFilterTo = props.serverId;
			if (serverIdToFilterTo) {
				params.set("s", serverIdToFilterTo);
			}
			router.push(`/search?${params.toString()}`);
		}
	};

	return (
		<form onSubmit={handleSubmit} className={cn("w-full", props.className)}>
			<Input
				value={searchInput}
				className={cn("mb-4 w-full", props.className)}
				onChange={handleInputChange}
				placeholder={props.placeholder ?? "Search"}
				type="search"
			/>
		</form>
	);
}
