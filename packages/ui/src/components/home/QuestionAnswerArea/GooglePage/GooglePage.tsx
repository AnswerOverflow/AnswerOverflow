import { forwardRef } from "react";
import { GoogleResult } from "./GoogleResult";
import { GoogleSearchBar } from "./GoogleSearchBar";

export interface GooglePageProps {
	result: {
		url: string;
		title: string;
		description: string;
	};
}

export const GooglePage = forwardRef<HTMLDivElement, GooglePageProps>(function GooglePageFunc(
	{ result },
	ref
) {
	return (
		<div className="flex min-h-[10rem] w-full flex-col items-center justify-center gap-5 rounded-md bg-[#202124] py-5">
			{/* Searchbar */}
			<GoogleSearchBar />

			{/* Result */}
			<GoogleResult
				url={result.url}
				title={result.title}
				description={result.description}
				ref={ref}
			/>
		</div>
	);
});
