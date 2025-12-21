import { Database } from "@packages/database/database";
import { AnswerOverflowLogo } from "@packages/ui/components/answer-overflow-logo";
import { parseSnowflakeId } from "@packages/ui/utils/snowflake";
import { Effect, Option } from "effect";
import { ImageResponse } from "next/og";
import { runtime } from "../../../../lib/runtime";
import {
	formatNumber,
	getOgFontConfig,
	loadOgFonts,
	makeServerIconLink,
	truncate,
	validateImageUrl,
} from "../shared";

export const preferredRegion = "iad1";

const UsersIcon = () => (
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
		<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
		<circle cx="9" cy="7" r="4" />
		<path d="M22 21v-2a4 4 0 0 0-3-3.87" />
		<path d="M16 3.13a4 4 0 0 1 0 7.75" />
	</svg>
);

const ChannelsIcon = () => (
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
		<path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
	</svg>
);

export async function GET(req: Request) {
	const fonts = await loadOgFonts();

	const { searchParams } = new URL(req.url);
	const id = searchParams.get("id");
	const isTenant = searchParams.get("tenant") === "true";
	if (!id) {
		return new Response("Missing community ID", {
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
		const liveData =
			yield* database.public.servers.getServerByDiscordIdWithChannels({
				discordId: parsed.value.id,
			});
		return liveData;
	}).pipe(runtime.runPromise);

	if (!data) {
		return new Response("Community not found", {
			status: 404,
		});
	}

	const { server, channels } = data;

	const iconUrl = makeServerIconLink(server, 256);
	const isIconValid = await validateImageUrl(iconUrl);
	const icon = isIconValid ? iconUrl : undefined;
	const channelCount = channels.length;
	const memberCount = server.approximateMemberCount;

	const ServerIcon = () => {
		if (icon) {
			return (
				<img
					src={icon}
					alt="Server Icon"
					style={{
						width: "180px",
						height: "180px",
						borderRadius: "50%",
						border: "4px solid #8c8c8c",
					}}
				/>
			);
		}
		return (
			<div
				style={{
					width: "180px",
					height: "180px",
					borderRadius: "50%",
					border: "4px solid #8c8c8c",
					backgroundColor: "#5865F2",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					fontSize: "72px",
					fontWeight: "bold",
					color: "white",
				}}
			>
				{server.name.charAt(0).toUpperCase()}
			</div>
		);
	};

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
				gap: "40px",
			}}
		>
			<ServerIcon />
			<div
				style={{
					width: "2px",
					height: "200px",
					backgroundColor: "#d1d5db",
				}}
			/>
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					alignItems: "flex-start",
					gap: "12px",
				}}
			>
				<h1
					style={{
						fontSize: "56px",
						fontFamily: "Satoshi Black",
						color: "black",
						margin: 0,
					}}
				>
					{truncate(server.name, 30)}
				</h1>
				<div
					style={{
						display: "flex",
						flexDirection: "row",
						alignItems: "center",
						gap: "10px",
					}}
				>
					<ChannelsIcon />
					<p
						style={{
							fontSize: "32px",
							fontFamily: "Satoshi Bold",
							color: "black",
							opacity: 0.8,
							margin: 0,
						}}
					>
						{channelCount} channel{channelCount !== 1 ? "s" : ""}
					</p>
				</div>
				<div
					style={{
						display: "flex",
						flexDirection: "row",
						alignItems: "center",
						gap: "10px",
					}}
				>
					<UsersIcon />
					<p
						style={{
							fontSize: "32px",
							fontFamily: "Satoshi Bold",
							color: "black",
							opacity: 0.8,
							margin: 0,
						}}
					>
						{formatNumber(memberCount)} members
					</p>
				</div>
			</div>
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
		</div>,
		{
			width: 1200,
			height: 630,
			fonts: getOgFontConfig(fonts),
		},
	);
}
