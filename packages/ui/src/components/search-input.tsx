"use client";

import { cn } from "@packages/ui/lib/utils";
import { Search, X } from "lucide-react";
import * as React from "react";
import { Spinner } from "./spinner";

type SearchInputProps = {
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	isSearching?: boolean;
	className?: string;
	inputClassName?: string;
	autoFocus?: boolean;
};

function SearchInput({
	value,
	onChange,
	placeholder = "Search...",
	isSearching = false,
	className,
	inputClassName,
	autoFocus = false,
}: SearchInputProps) {
	const inputRef = React.useRef<HTMLInputElement>(null);

	const handleClear = () => {
		onChange("");
		inputRef.current?.focus();
	};

	return (
		<div className={cn("relative", className)}>
			<div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
				{isSearching ? (
					<Spinner className="size-4 text-muted-foreground" />
				) : (
					<Search className="size-4 text-muted-foreground" />
				)}
			</div>
			<input
				ref={inputRef}
				type="search"
				value={value}
				onChange={(e) => onChange(e.target.value)}
				placeholder={placeholder}
				autoFocus={autoFocus}
				className={cn(
					"h-11 w-full rounded-lg border border-input bg-background pl-10 pr-10 text-base shadow-sm transition-colors",
					"placeholder:text-muted-foreground",
					"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-transparent",
					"disabled:cursor-not-allowed disabled:opacity-50",
					"[&::-webkit-search-cancel-button]:hidden",
					inputClassName,
				)}
			/>
			{value && (
				<button
					type="button"
					onClick={handleClear}
					className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground transition-colors"
					aria-label="Clear search"
				>
					<X className="size-4" />
				</button>
			)}
		</div>
	);
}

export { SearchInput };
