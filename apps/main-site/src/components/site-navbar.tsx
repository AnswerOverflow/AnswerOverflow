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
	const [searchQuery, setSearchQuery] = useState("");

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
			showGetStarted={!session?.user}
			getStartedProps={{
				href: "/dashboard",
				children: "Get Started",
			}}
			userSection={
				session?.user
					? {
							user: {
								name: session.user.name ?? null,
								image: session.user.image ?? null,
								email: session.user.email ?? null,
							},
							onSignOut: async () => {
								await authClient.signOut();
								router.push("/");
							},
						}
					: {
							signInHref: "/api/auth/sign-in",
						}
			}
		/>
	);
}
