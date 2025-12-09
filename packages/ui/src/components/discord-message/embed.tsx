import type { Embed } from "@packages/database/convex/schema";
import dayjs from "dayjs";
import type React from "react";

function EmbedMarkdown({ content }: { content: string }) {
	const parts: React.ReactNode[] = [];
	let remaining = content;
	let keyIndex = 0;

	const urlRegex = /(https?:\/\/[^\s<>\[\]]+)/g;
	const boldRegex = /\*\*(.+?)\*\*/g;
	const linkWithTextRegex = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;

	const processText = (text: string): React.ReactNode[] => {
		const result: React.ReactNode[] = [];
		let lastIndex = 0;
		let match: RegExpExecArray | null;

		linkWithTextRegex.lastIndex = 0;
		while ((match = linkWithTextRegex.exec(text)) !== null) {
			if (match.index > lastIndex) {
				result.push(...processPlainText(text.slice(lastIndex, match.index)));
			}
			const linkText = match[1];
			const linkUrl = match[2];
			if (linkText && linkUrl) {
				result.push(
					<a
						key={keyIndex++}
						href={linkUrl}
						target="_blank"
						rel="noreferrer"
						className="text-blue-500 hover:underline"
					>
						{linkText}
					</a>,
				);
			}
			lastIndex = match.index + match[0].length;
		}

		if (lastIndex < text.length) {
			result.push(...processPlainText(text.slice(lastIndex)));
		}

		return result;
	};

	const processPlainText = (text: string): React.ReactNode[] => {
		const result: React.ReactNode[] = [];
		let lastIndex = 0;
		let match: RegExpExecArray | null;

		boldRegex.lastIndex = 0;
		while ((match = boldRegex.exec(text)) !== null) {
			if (match.index > lastIndex) {
				result.push(...processUrls(text.slice(lastIndex, match.index)));
			}
			const boldContent = match[1];
			if (boldContent) {
				result.push(<strong key={keyIndex++}>{boldContent}</strong>);
			}
			lastIndex = match.index + match[0].length;
		}

		if (lastIndex < text.length) {
			result.push(...processUrls(text.slice(lastIndex)));
		}

		return result;
	};

	const processUrls = (text: string): React.ReactNode[] => {
		const result: React.ReactNode[] = [];
		let lastIndex = 0;
		let match: RegExpExecArray | null;

		urlRegex.lastIndex = 0;
		while ((match = urlRegex.exec(text)) !== null) {
			if (match.index > lastIndex) {
				result.push(
					<span key={keyIndex++}>{text.slice(lastIndex, match.index)}</span>,
				);
			}
			const url = match[1];
			if (url) {
				result.push(
					<a
						key={keyIndex++}
						href={url}
						target="_blank"
						rel="noreferrer"
						className="text-blue-500 hover:underline break-all"
					>
						{url}
					</a>,
				);
			}
			lastIndex = match.index + match[0].length;
		}

		if (lastIndex < text.length) {
			result.push(<span key={keyIndex++}>{text.slice(lastIndex)}</span>);
		}

		return result;
	};

	const paragraphs = remaining.split(/\n\n+/);
	for (let i = 0; i < paragraphs.length; i++) {
		const paragraph = paragraphs[i];
		if (!paragraph) continue;

		const lines = paragraph.split(/\n/);
		const lineElements: React.ReactNode[] = [];

		for (let j = 0; j < lines.length; j++) {
			const line = lines[j];
			if (line === undefined) continue;
			lineElements.push(...processText(line));
			if (j < lines.length - 1) {
				lineElements.push(<br key={`br-${keyIndex++}`} />);
			}
		}

		parts.push(
			<p key={`p-${i}`} className="mb-3 last:mb-0">
				{lineElements}
			</p>,
		);
	}

	return <>{parts}</>;
}

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
						<EmbedMarkdown content={field.value} />
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
					return (
						<div className="mt-4 overflow-hidden rounded" key={idx}>
							<img
								src={embed.url ?? embed.image?.proxyUrl ?? embed.image?.url}
								width={scaledStyle.scaledWidth}
								height={scaledStyle.scaledHeight}
								style={{
									width: scaledStyle.width,
									height: scaledStyle.height,
									maxWidth: scaledStyle.maxWidth,
									aspectRatio: `${aspectRatio}`,
								}}
								loading="lazy"
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
								<EmbedMarkdown content={embed.description} />
							</div>
						)}
						{embed.fields && embed.fields.length > 0 && (
							<EmbedFields fields={embed.fields} />
						)}
						{previewUrl?.width && previewUrl.height && (
							<div className="mt-4 max-h-[300px] overflow-hidden rounded">
								<img
									className="max-h-full overflow-hidden object-cover"
									src={previewUrl.proxyUrl ?? previewUrl.url}
									width={previewUrl.width}
									height={previewUrl.height}
									style={{
										...getScaledDownWidth({
											width: previewUrl.width,
											height: previewUrl.height,
										}),
										aspectRatio: `${previewUrl.width / previewUrl.height}`,
									}}
									loading="lazy"
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
