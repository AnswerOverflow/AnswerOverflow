import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Database } from "@packages/database/database";
import { AnswerOverflowLogo } from "@packages/ui/components/answer-overflow-logo";
import {
	getSnowflakeUTCDate,
	parseSnowflakeId,
} from "@packages/ui/utils/snowflake";
import { Effect, Option } from "effect";
import { ImageResponse } from "next/og";
import { runtime } from "../../../../lib/runtime";

export const preferredRegion = "iad1";

const fontDir = join(process.cwd(), "src/styles");
const satoshiBold = readFile(join(fontDir, "Satoshi-Black.ttf"));
const satoshiBoldFont = readFile(join(fontDir, "Satoshi-Bold.ttf"));

const CalendarIcon = () => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width="48"
		height="48"
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

const SolvedIcon = () => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width="48"
		height="48"
		viewBox="0 0 24 24"
		fill="none"
		stroke="green"
		opacity="0.8"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
	>
		<path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
		<path d="m9 12 2 2 4-4" />
	</svg>
);

// TODO: Bring back reply count in a more efficient way
// const MessagesIcon = () => (
// 	<svg
// 		xmlns="http://www.w3.org/2000/svg"
// 		width="48"
// 		height="48"
// 		viewBox="0 0 24 24"
// 		fill="none"
// 		opacity="0.8"
// 		stroke="currentColor"
// 		strokeWidth="2"
// 		strokeLinecap="round"
// 		strokeLinejoin="round"
// 	>
// 		<path d="M14 9a2 2 0 0 1-2 2H6l-4 4V4c0-1.1.9-2 2-2h8a2 2 0 0 1 2 2v5Z" />
// 		<path d="M18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1" />
// 	</svg>
// );

function truncate(str: string, n = 30) {
	const truncated = str.length > n ? `${str.slice(0, n - 1)}...` : str;
	return truncated.replace(/[^\p{L}\d\s-]+/gu, "");
}

function makeServerIconLink(
	server: { discordId: bigint; icon?: string | null },
	size = 64,
) {
	if (!server.icon) return undefined;
	return `https://cdn.discordapp.com/icons/${server.discordId}/${server.icon}.png?size=${size}`;
}

export async function GET(req: Request) {
	const [satoshiBoldData, satoshiBoldFontData] = await Promise.all([
		satoshiBold,
		satoshiBoldFont,
	]);

	const { searchParams } = new URL(req.url);
	const id = searchParams.get("id");
	const isTenant = searchParams.get("tenant") === "true";
	if (!id) {
		return new Response("Failed to generate the image", {
			status: 400,
		});
	}

	const parsed = parseSnowflakeId(id);
	if (Option.isNone(parsed)) {
		return new Response("Invalid ID", {
			status: 400,
		});
	}

	const data = await Effect.gen(function* () {
		const database = yield* Database;
		const liveData = yield* database.private.messages.getMessagePageHeaderData({
			messageId: parsed.value.id,
		});
		return liveData;
	}).pipe(runtime.runPromise);

	if (!data) {
		return new Response("Post not found", {
			status: 404,
		});
	}

	const { server, channel, thread, firstMessage } = data;

	if (!firstMessage) {
		return new Response("Post not found", {
			status: 404,
		});
	}

	const title = thread?.name ?? firstMessage.message.content ?? "";
	const isSolved = (firstMessage.solutions?.length ?? 0) > 0;
	const date = getSnowflakeUTCDate(firstMessage.message.id.toString());
	const icon = makeServerIconLink(server, 96);

	const ServerIcon = () => {
		if (icon) {
			return (
				<img
					src={icon}
					alt="Server Icon"
					style={{
						width: "96px",
						height: "96px",
						borderRadius: "50%",
						border: "1px solid #8c8c8c",
					}}
				/>
			);
		}
		return null;
	};

	const Header = () => (
		<div
			style={{
				width: "100%",
				justifyContent: "flex-start",
				alignItems: "center",
				display: "flex",
				gap: "20px",
			}}
		>
			<ServerIcon />
			<h1
				style={{
					fontSize: "40px",
					opacity: 0.8,
				}}
			>
				{truncate(server.name)}
			</h1>
			<div
				style={{
					height: "32px",
					transform: "rotate(30deg)",
					borderLeftWidth: "2px",
					borderLeftColor: "#8c8c8c",
				}}
			/>

			<h2
				style={{
					fontSize: "40px",
					opacity: 0.75,
				}}
			>
				{truncate(channel.name)}
			</h2>
		</div>
	);

	const MetaData = () => (
		<div
			style={{
				display: "flex",
				flexDirection: "row",
				alignItems: "center",
				gap: "50px",
			}}
		>
			<div
				style={{
					display: "flex",
					flexDirection: "row",
					alignItems: "center",
					justifyContent: "center",
					gap: "10px",
				}}
			>
				<CalendarIcon />
				<p
					style={{
						fontSize: "30px",
						fontFamily: "Satoshi Bold",
						color: "black",
						textAlign: "center",
						opacity: 0.8,
					}}
				>
					{date}
				</p>
			</div>
			{/* TODO: Bring back reply count in a more efficient way
			<div
				style={{
					display: "flex",
					flexDirection: "row",
					alignItems: "center",
					justifyContent: "center",
					gap: "10px",
				}}
			>
				<MessagesIcon />
				<p
					style={{
						fontSize: "30px",
						fontFamily: "Satoshi Bold",
						color: "black",
						textAlign: "center",
						opacity: 0.8,
					}}
				>
					{numReplies} replies
				</p>
			</div>
			*/}
			{isSolved && (
				<div
					style={{
						display: "flex",
						flexDirection: "row",
						alignItems: "center",
						justifyContent: "center",
						gap: "10px",
					}}
				>
					<SolvedIcon />
					<p
						style={{
							fontSize: "30px",
							fontFamily: "Satoshi Bold",
							color: "black",
							textAlign: "center",
							opacity: 0.8,
						}}
					>
						Solved
					</p>
				</div>
			)}
		</div>
	);

	const Body = () => (
		<div
			style={{
				width: "100%",
				display: "flex",
				flexDirection: "column",
				gap: "40px",
			}}
		>
			<p
				style={{
					fontSize: "60px",
					fontFamily: "Satoshi Bold",
					color: "black",
					marginTop: "0px",
					width: "100%",
					textAlign: "left",
				}}
			>
				{truncate(title, 100)}
			</p>
			<MetaData />
		</div>
	);

	return new ImageResponse(
		<div
			style={{
				height: "100%",
				width: "100%",
				fontFamily: "Satoshi Black",
				position: "relative",
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				padding: "60px",
				backgroundColor: "white",
				gap: "20px",
			}}
		>
			<Header />
			<Body />
			{!isTenant && (
				<div
					style={{
						position: "absolute",
						display: "flex",
						right: "80px",
						bottom: "40px",
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
			)}
			<div
				style={{
					height: "100%",
					backgroundColor: "red",
				}}
			/>
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
