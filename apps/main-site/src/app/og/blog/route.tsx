import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { AnswerOverflowLogo } from "@packages/ui/components/answer-overflow-logo";
import { ImageResponse } from "next/og";
import { blog } from "@/.source/server";

export const preferredRegion = "iad1";

const fontDir = join(process.cwd(), "src/styles");
const satoshiBold = readFile(join(fontDir, "Satoshi-Black.ttf"));
const satoshiBoldFont = readFile(join(fontDir, "Satoshi-Bold.ttf"));

const CalendarIcon = () => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width="36"
		height="36"
		viewBox="0 0 24 24"
		opacity="0.8"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
	>
		<rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
		<line x1="16" x2="16" y1="2" y2="6" />
		<line x1="8" x2="8" y1="2" y2="6" />
		<line x1="3" x2="21" y1="10" y2="10" />
		<path d="M8 14h.01" />
		<path d="M12 14h.01" />
		<path d="M16 14h.01" />
		<path d="M8 18h.01" />
		<path d="M12 18h.01" />
		<path d="M16 18h.01" />
	</svg>
);

function truncate(str: string, n = 30) {
	const truncated = str.length > n ? `${str.slice(0, n - 1)}...` : str;
	return truncated.replace(/[^\p{L}\d\s-]+/gu, "");
}

function formatDate(dateString: string | Date): string {
	const date =
		typeof dateString === "string" ? new Date(dateString) : dateString;
	return date.toLocaleDateString("en-US", {
		year: "numeric",
		month: "long",
		day: "numeric",
	});
}

export async function GET(req: Request) {
	const [satoshiBoldData, satoshiBoldFontData] = await Promise.all([
		satoshiBold,
		satoshiBoldFont,
	]);

	const { searchParams } = new URL(req.url);
	const slug = searchParams.get("slug");
	if (!slug) {
		return new Response("Missing blog slug", {
			status: 400,
		});
	}

	const post = blog.find((p) => p.info.path.replace(/\.mdx?$/, "") === slug);

	if (!post) {
		return new Response("Blog post not found", {
			status: 404,
		});
	}

	const title = post.title;
	const description = post.description;
	const date = formatDate(post.date);

	const AUTHORS: Record<string, { name: string; role: string; image: string }> =
		{
			"AnswerOverflow Team": {
				name: "Rhys Sullivan",
				role: "Founder",
				image: "https://answeroverflow.com/rhys_icon.png",
			},
		};

	const DEFAULT_AUTHOR = {
		name: "Rhys Sullivan",
		role: "Founder",
		image: "https://answeroverflow.com/rhys_icon.png",
	};

	const authorInfo =
		post.author && post.author in AUTHORS
			? (AUTHORS[post.author] ?? DEFAULT_AUTHOR)
			: DEFAULT_AUTHOR;

	return new ImageResponse(
		<div
			style={{
				height: "100%",
				width: "100%",
				fontFamily: "Satoshi Black",
				position: "relative",
				display: "flex",
				flexDirection: "row",
				alignItems: "center",
				justifyContent: "flex-start",
				padding: "60px 80px",
				backgroundColor: "white",
				gap: "50px",
			}}
		>
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					alignItems: "flex-start",
					gap: "20px",
				}}
			>
				<div
					style={{
						display: "flex",
						flexDirection: "row",
						alignItems: "center",
						gap: "20px",
					}}
				>
					<img
						src={authorInfo.image}
						alt={authorInfo.name}
						width={140}
						height={140}
						style={{
							borderRadius: "50%",
							border: "3px solid #e5e7eb",
						}}
					/>
					<div
						style={{
							display: "flex",
							flexDirection: "column",
							alignItems: "flex-start",
							gap: "4px",
						}}
					>
						<p
							style={{
								fontSize: "24px",
								fontFamily: "Satoshi Bold",
								color: "black",
								margin: 0,
							}}
						>
							{authorInfo.name}
						</p>
						<p
							style={{
								fontSize: "18px",
								fontFamily: "Satoshi Bold",
								color: "#6b7280",
								margin: 0,
							}}
						>
							{authorInfo.role}
						</p>
					</div>
				</div>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: "12px",
					}}
				>
					<span
						style={{
							fontSize: "20px",
							fontFamily: "Satoshi Bold",
							color: "#6366f1",
							textTransform: "uppercase",
							letterSpacing: "0.05em",
						}}
					>
						Blog
					</span>
					<div
						style={{
							display: "flex",
							flexDirection: "row",
							alignItems: "center",
							gap: "8px",
						}}
					>
						<CalendarIcon />
						<p
							style={{
								fontSize: "20px",
								fontFamily: "Satoshi Bold",
								color: "#6b7280",
								margin: 0,
							}}
						>
							{date}
						</p>
					</div>
				</div>
			</div>
			<div
				style={{
					width: "2px",
					height: "220px",
					backgroundColor: "#d1d5db",
				}}
			/>
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					gap: "16px",
					flex: 1,
				}}
			>
				<h1
					style={{
						fontSize: "48px",
						fontFamily: "Satoshi Black",
						color: "black",
						margin: 0,
						lineHeight: 1.15,
					}}
				>
					{truncate(title, 70)}
				</h1>
				{description && (
					<p
						style={{
							fontSize: "24px",
							fontFamily: "Satoshi Bold",
							color: "#6b7280",
							margin: 0,
							lineHeight: 1.4,
						}}
					>
						{truncate(description, 130)}
					</p>
				)}
			</div>
			<div
				style={{
					position: "absolute",
					right: "80px",
					bottom: "40px",
					display: "flex",
					gap: "20px",
					alignItems: "center",
				}}
			>
				<AnswerOverflowLogo
					style={{
						fill: "none",
						stroke: "#000",
						strokeWidth: 13,
						strokeMiterlimit: 10,
					}}
				/>
			</div>
		</div>,
		{
			width: 1200,
			height: 630,
			fonts: [
				{
					name: "Satoshi Black",
					data: satoshiBoldData,
				},
				{
					name: "Satoshi Bold",
					data: satoshiBoldFontData,
				},
			],
		},
	);
}
