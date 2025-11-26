"use client";

import { AnswerOverflowLogo } from "@packages/ui/components/answer-overflow-logo";
import { authClient } from "@packages/ui/components/convex-client-provider";
import { Input } from "@packages/ui/components/input";
import { Navbar } from "@packages/ui/components/navbar";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

export function SiteNavbar() {
	const router = useRouter();
	const pathname = usePathname();
	const { data: session } = authClient.useSession();
	const [mounted, setMounted] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");

	useEffect(() => {
		setMounted(true);
	}, []);

	if (pathname?.startsWith("/dashboard")) {
		return null;
	}

	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault();
		if (searchQuery.trim()) {
			router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
		}
	};

	const searchBar = (
		<form onSubmit={handleSearch} className="w-full">
			<Input
				type="search"
				value={searchQuery}
				onChange={(e) => setSearchQuery(e.target.value)}
				placeholder="Search Discord messages..."
				className="w-full"
			/>
		</form>
	);

	return (
		<Navbar
			logo={<AnswerOverflowLogo width={180} />}
			homeHref="/"
			searchBar={searchBar}
			showSearch={true}
			searchHref="/search"
			showGetStarted={mounted ? !session?.user : true}
			getStartedProps={{
				href: "/dashboard",
				children: "Get Started",
			}}
		/>
	);
}
