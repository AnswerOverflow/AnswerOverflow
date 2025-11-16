import type { Embed } from "@packages/database/convex/schema";
import dayjs from "dayjs";

export function Embeds({ embeds }: { embeds: Embed[] | null }) {
	if (!embeds?.length) {
		return null;
	}
	return (
		<>
			{embeds.map((embed, idx) => {
				const borderLeftColor = embed.color
					? `#${embed.color.toString(16).padStart(6, "0")}`
					: "dadadc";
				if (embed.type === "gifv") {
					const { height, width } = embed.video!;
					return (
						<div className="mt-4 overflow-hidden rounded" key={idx}>
							<video
								autoPlay
								loop
								muted
								poster={embed.thumbnail?.proxyUrl ?? embed.thumbnail?.url}
								src={embed.video?.proxyUrl ?? embed.video?.url}
								style={getScaledDownWidth({ width: width!, height: height! })}
							/>
						</div>
					);
				}
				if (embed.type === "image") {
					const { height, width } = embed.image! ?? embed.thumbnail!;
					return (
						<div className="mt-4 overflow-hidden rounded" key={idx}>
							<img
								src={embed.url ?? embed.image?.proxyUrl ?? embed.image?.url}
								style={getScaledDownWidth({ width: width!, height: height! })}
							/>
						</div>
					);
				}

				const previewUrl = embed.image ?? embed.thumbnail;
				return (
					<div
						className="grid w-md rounded-md border border-l-4 px-4 pt-2 pb-3 shadow-xs"
						key={idx}
						style={{
							borderLeftColor,
						}}
					>
						{embed.provider && (
							<span className="text-neutral-600 text-xs">
								{embed.provider.name}
							</span>
						)}
						{embed.author && (
							<a
								className="mt-2 font-semibold text-sm hover:underline"
								href={embed.author.url}
								target="_blank"
								rel="noreferrer"
							>
								{embed.author.name}
							</a>
						)}
						{embed.title && (
							<a
								className="mt-2 font-semibold text-blue-500 hover:underline"
								href={embed.url}
								target="_blank"
								rel="noreferrer"
							>
								{embed.title}
							</a>
						)}
						{embed.type !== "video" && (
							<div className="mt-1 text-neutral-500 text-sm">
								{embed.description}
							</div>
						)}
						{previewUrl && (
							<div className="mt-4 max-h-[300px] overflow-hidden rounded">
								<img
									className="max-h-full overflow-hidden object-cover"
									src={previewUrl.proxyUrl ?? previewUrl.url}
									style={getScaledDownWidth({
										width: previewUrl.width ?? 0,
										height: previewUrl.height ?? 0,
									})}
								/>
							</div>
						)}
						<div>
							{embed.footer && (
								<div className="mt-2 flex items-center">
									{embed.footer.iconUrl && (
										<img
											className="mr-2 size-5 rounded-full object-contain"
											src={embed.footer.proxyIconUrl ?? embed.footer.iconUrl}
										/>
									)}
									<div className="flex items-center gap-1 text-[13px]">
										<p>{embed.footer.text}</p>
										{embed.timestamp && (
											<>
												•
												<p>{dayjs(embed.timestamp).format("M/D/YY, h:mm A")}</p>
											</>
										)}
									</div>
								</div>
							)}
						</div>
					</div>
				);
			})}
		</>
	);
}

function getScaledDownWidth({
	height,
	width,
}: {
	height: number;
	width: number;
}) {
	const MAX_WIDTH = 400;
	const MAX_HEIGHT = 300;

	const heightScale = Math.min(1, MAX_HEIGHT / height);
	const widthScale = Math.min(1, MAX_WIDTH / width);
	const scale = Math.min(heightScale, widthScale);

	const scaledWidth = Math.floor(width * scale);
	const scaledHeight = Math.floor(height * scale);

	return {
		width: `${scaledWidth}px`,
		height: `${scaledHeight}px`,
		maxWidth: "100%",
	};
}
