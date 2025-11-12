"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { cn } from "../lib/utils";
import { Input } from "./input";

export interface MessagesSearchBarProps {
	placeholder?: string;
	className?: string;
	serverId?: string;
}

export function MessagesSearchBar(props: MessagesSearchBarProps) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const query = searchParams?.get("q") ?? "";
	const [searchInput, setSearchInput] = useState<string>(query);

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				const params = new URLSearchParams();
				params.set("q", searchInput);
				const serverIdToFilterTo = props.serverId;
				if (serverIdToFilterTo) {
					params.set("s", serverIdToFilterTo);
				}
				router.push(`/search?${params.toString()}`);
			}}
			className={cn("w-full", props.className)}
		>
			<Input
				value={searchInput}
				className={cn("mb-4 w-full", props.className)}
				onChange={(e) => setSearchInput(e.target.value)}
				placeholder={props.placeholder ?? "Search"}
				type="search"
			/>
		</form>
	);
}
