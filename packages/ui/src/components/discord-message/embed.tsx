import type { Embed } from "@packages/database/convex/schema";
import dayjs from "dayjs";
import { ExpandableImage } from "../image-lightbox";
import { DiscordMarkdown } from "./renderer";

function EmbedFields({
	fields,
}: {
	fields: Array<{ name: string; value: string; inline?: boolean }>;
}) {
	return (
		<div className="mt-3 grid gap-2">
			{fields.map((field, idx) => (
				<div key={idx} className={field.inline ? "inline-block mr-4" : ""}>
					<div className="font-semibold text-[13px] text-foreground">
						{field.name}
					</div>
					<div className="text-[13px] text-muted-foreground">
						<DiscordMarkdown>{field.value}</DiscordMarkdown>
					</div>
				</div>
			))}
		</div>
	);
}

export function Embeds({ embeds }: { embeds: Embed[] | null }) {
	if (!embeds?.length) {
		return null;
	}
	return (
		<>
			{embeds.map((embed, idx) => {
				const borderLeftColor = embed.color
					? `#${embed.color.toString(16).padStart(6, "0")}`
					: "#dadadc";
				if (embed.type === "gifv") {
					if (!embed.video?.width || !embed.video?.height) {
						return null;
					}
					const { height, width } = embed.video;
					const scaledStyle = getScaledDownWidth({
						width,
						height,
					});
					const aspectRatio = width / height;
					return (
						<div className="mt-4 overflow-hidden rounded" key={idx}>
							<video
								autoPlay
								loop
								muted
								poster={embed.thumbnail?.proxyUrl ?? embed.thumbnail?.url}
								src={embed.video?.proxyUrl ?? embed.video?.url}
								width={scaledStyle.scaledWidth}
								height={scaledStyle.scaledHeight}
								style={{
									width: scaledStyle.width,
									height: scaledStyle.height,
									maxWidth: scaledStyle.maxWidth,
									aspectRatio: `${aspectRatio}`,
								}}
							/>
						</div>
					);
				}
				if (embed.type === "image") {
					const imageData = embed.image ?? embed.thumbnail;
					if (!imageData?.width || !imageData?.height) {
						return null;
					}
					const { height, width } = imageData;
					const scaledStyle = getScaledDownWidth({
						width,
						height,
					});
					const aspectRatio = width / height;
					const imageSrc =
						embed.url ?? embed.image?.proxyUrl ?? embed.image?.url ?? "";
					return (
						<div className="mt-4 overflow-hidden rounded" key={idx}>
							<ExpandableImage
								src={imageSrc}
								alt={embed.title ?? "Embedded image"}
								width={scaledStyle.scaledWidth}
								height={scaledStyle.scaledHeight}
								style={{
									width: scaledStyle.width,
									height: scaledStyle.height,
									maxWidth: scaledStyle.maxWidth,
									aspectRatio: `${aspectRatio}`,
								}}
							/>
						</div>
					);
				}

				const previewUrl = embed.image ?? embed.thumbnail;
				return (
					<div
						className="mt-4 grid rounded border border-l-4 bg-secondary/30 pl-3 pr-4 pt-2 pb-3"
						key={idx}
						style={{
							borderLeftColor,
							maxWidth: "488px",
						}}
					>
						{embed.provider && (
							<span className="text-muted-foreground text-xs">
								{embed.provider.name}
							</span>
						)}
						{embed.author && (
							<a
								className="mt-2 font-semibold text-[13px] text-foreground hover:underline"
								href={embed.author.url}
								target="_blank"
								rel="noreferrer"
							>
								{embed.author.name}
							</a>
						)}
						{embed.title && (
							<div className="mt-2 font-semibold text-[14px] text-foreground">
								{embed.url ? (
									<a
										className="hover:underline"
										href={embed.url}
										target="_blank"
										rel="noreferrer"
									>
										{embed.title}
									</a>
								) : (
									embed.title
								)}
							</div>
						)}
						{embed.type !== "video" && embed.description && (
							<div className="mt-2 text-muted-foreground text-[13px] whitespace-pre-wrap">
								<DiscordMarkdown>{embed.description}</DiscordMarkdown>
							</div>
						)}
						{embed.fields && embed.fields.length > 0 && (
							<EmbedFields fields={embed.fields} />
						)}
						{previewUrl?.width && previewUrl.height && (
							<div className="mt-4 max-h-[300px] overflow-hidden rounded">
								<ExpandableImage
									className="max-h-full overflow-hidden object-cover"
									src={previewUrl.proxyUrl ?? previewUrl.url ?? ""}
									alt={embed.title ?? "Preview image"}
									width={previewUrl.width}
									height={previewUrl.height}
									style={{
										...getScaledDownWidth({
											width: previewUrl.width,
											height: previewUrl.height,
										}),
										aspectRatio: `${previewUrl.width / previewUrl.height}`,
									}}
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
											alt=""
										/>
									)}
									<div className="flex items-center gap-1 text-[13px] text-muted-foreground">
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
		scaledWidth,
		scaledHeight,
	};
}
