"use client";

import { Card, CardContent } from "@packages/ui/components/card";
import { Link } from "@packages/ui/components/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

interface TOCItem {
	id: string;
	text: ReactNode;
}

interface BlogTOCProps {
	headings: TOCItem[];
}

export function BlogTOC({ headings }: BlogTOCProps) {
	const [activeId, setActiveId] = useState<string>("");

	useEffect(() => {
		const article = document.querySelector("article");
		if (!article) return;

		const headingElements = article.querySelectorAll("h2");

		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						setActiveId(entry.target.id);
					}
				});
			},
			{ rootMargin: "-100px 0px -80% 0px" },
		);

		headingElements.forEach((heading) => observer.observe(heading));

		return () => observer.disconnect();
	}, []);

	const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
		e.preventDefault();
		const element = document.getElementById(id);
		if (element) {
			const headerOffset = 80;
			const elementPosition = element.getBoundingClientRect().top;
			const offsetPosition = elementPosition + window.scrollY - headerOffset;

			window.scrollTo({
				top: offsetPosition,
				behavior: "smooth",
			});

			window.history.pushState(null, "", `#${id}`);
		}
	};

	if (headings.length === 0) return null;

	return (
		<div className="space-y-6">
			<div>
				<h3 className="font-semibold mb-3 text-sm">On this page</h3>
				<nav className="space-y-2">
					{headings.map((heading) => (
						<Link
							key={heading.id}
							href={`#${heading.id}`}
							onClick={(e) => handleClick(e, heading.id)}
							className={`block text-sm transition-colors ${
								activeId === heading.id
									? "text-foreground font-medium"
									: "text-muted-foreground hover:text-foreground"
							}`}
						>
							{heading.text}
						</Link>
					))}
				</nav>
			</div>

			<Card className="p-0">
				<Link href={"/dashboard"}>
					<CardContent className="hover:underline p-4 hover:cursor-pointer">
						<Image
							src="/answer-overflow-banner-v3.png"
							alt="AnswerOverflow"
							width={300}
							height={150}
							className="w-full h-auto rounded-lg"
						/>
						<h4 className="font-semibold mb-2">Try AnswerOverflow</h4>
						<p className="text-sm text-muted-foreground mb-4">
							Make your Discord community knowledge searchable
						</p>
					</CardContent>
				</Link>
			</Card>
		</div>
	);
}
