"use client";

import { Button } from "@packages/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@packages/ui/components/card";
import { Download } from "lucide-react";
import Image from "next/image";

export function BrandPageClient() {
	const handleDownload = (fileName: string) => {
		const link = document.createElement("a");
		link.href = `/${fileName}`;
		link.download = fileName;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	};

	return (
		<div className="container mx-auto px-4 py-16 max-w-6xl">
			<div className="mb-12 text-center">
				<h1 className="text-4xl font-bold mb-4">
					Answer Overflow Brand Assets
				</h1>
				<p className="text-lg text-muted-foreground">
					Download our official logos for use in your projects
				</p>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
				<Card>
					<CardHeader>
						<CardTitle>Light Theme Logo</CardTitle>
						<CardDescription>
							White logo on transparent background
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="bg-black rounded-lg p-8 flex items-center justify-center min-h-[200px]">
							<Image
								src="/AnswerOverflowLogoLight.png"
								alt="Answer Overflow Light Logo"
								width={400}
								height={110}
								className="w-full h-auto max-w-md"
							/>
						</div>
						<Button
							onClick={() => handleDownload("AnswerOverflowLogoLight.png")}
							className="w-full"
						>
							<Download />
							Download Light Logo
						</Button>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Dark Theme Logo</CardTitle>
						<CardDescription>
							Black logo on transparent background
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="bg-white rounded-lg p-8 flex items-center justify-center min-h-[200px]">
							<Image
								src="/AnswerOverflowLogoDark.png"
								alt="Answer Overflow Dark Logo"
								width={400}
								height={110}
								className="w-full h-auto max-w-md"
							/>
						</div>
						<Button
							onClick={() => handleDownload("AnswerOverflowLogoDark.png")}
							className="w-full"
						>
							<Download />
							Download Dark Logo
						</Button>
					</CardContent>
				</Card>
			</div>

			<div className="mt-12 p-6 bg-muted rounded-lg">
				<h2 className="text-xl font-semibold mb-3">Usage Guidelines</h2>
				<ul className="space-y-2 text-muted-foreground">
					<li>• Use the light logo on dark backgrounds</li>
					<li>• Use the dark logo on light backgrounds</li>
					<li>• Maintain adequate spacing around the logo</li>
					<li>• Do not alter, distort, or modify the logos</li>
				</ul>
			</div>
		</div>
	);
}
