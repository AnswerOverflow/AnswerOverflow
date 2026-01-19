"use client";

import type {
	ActionRowItem,
	ComponentButton,
	ComponentTextDisplay,
	ComponentThumbnail,
	ContainerChild,
	MessageComponent,
} from "@packages/database/convex/schema";
import { ButtonStyle, ComponentType } from "discord-api-types/v10";
import { ExternalLink, File } from "lucide-react";
import { ExpandableImage, ExpandableImageGallery } from "../image-lightbox";
import { DiscordMarkdown } from "./renderer";

function numberToHex(color: number): string {
	return `#${color.toString(16).padStart(6, "0")}`;
}

function TextDisplay({ content }: { content: string }) {
	return (
		<div className="text-sm [&_h1]:text-xl [&_h1]:font-bold [&_h1]:mb-1 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mb-1 [&_h3]:text-base [&_h3]:font-medium [&_h3]:mb-0.5">
			<DiscordMarkdown>{content}</DiscordMarkdown>
		</div>
	);
}

function Separator({
	divider,
	spacing,
}: {
	divider?: boolean;
	spacing?: number;
}) {
	const spacingClass = spacing === 1 ? "my-2" : spacing === 2 ? "my-4" : "my-3";
	if (divider) {
		return <hr className={`border-border ${spacingClass}`} />;
	}
	return <div className={spacingClass} />;
}

function Thumbnail({
	media,
	description,
}: {
	media: { url: string };
	description?: string;
}) {
	return (
		<ExpandableImage
			src={media.url}
			alt={description ?? ""}
			className="size-16 rounded object-cover"
		/>
	);
}

function ButtonComponent({
	style,
	label,
	url,
	disabled,
}: {
	style: number;
	label?: string;
	emoji?: string;
	url?: string;
	disabled?: boolean;
}) {
	const baseClasses =
		"inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium transition-colors";

	const styleClasses: Record<number, string> = {
		[ButtonStyle.Primary]:
			"bg-[#5865F2] text-white hover:bg-[#4752C4] disabled:opacity-50",
		[ButtonStyle.Secondary]:
			"bg-secondary text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50",
		[ButtonStyle.Success]:
			"bg-[#57F287] text-black hover:bg-[#3BA55C] disabled:opacity-50",
		[ButtonStyle.Danger]:
			"bg-[#ED4245] text-white hover:bg-[#C03537] disabled:opacity-50",
		[ButtonStyle.Link]:
			"bg-secondary text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50",
	};

	const className = `${baseClasses} ${styleClasses[style] ?? styleClasses[ButtonStyle.Secondary]}`;

	if (style === ButtonStyle.Link && url) {
		return (
			<a
				href={url}
				target="_blank"
				rel="noopener noreferrer"
				className={className}
			>
				{label}
				<ExternalLink className="size-3.5" />
			</a>
		);
	}

	return (
		<button type="button" disabled={disabled} className={className}>
			{label}
		</button>
	);
}

function Section({
	components,
	accessory,
}: {
	components: ComponentTextDisplay[];
	accessory?: ComponentThumbnail | ComponentButton;
}) {
	return (
		<div className="flex items-start gap-4">
			<div className="flex-1 space-y-1">
				{components.map((comp, idx) => (
					<TextDisplay key={comp.id ?? idx} content={comp.content} />
				))}
			</div>
			{accessory && (
				<div className="shrink-0">
					{accessory.type === ComponentType.Thumbnail ? (
						<Thumbnail
							media={accessory.media}
							description={accessory.description}
						/>
					) : (
						<ButtonComponent
							style={accessory.style}
							label={accessory.label}
							url={accessory.url}
							disabled={accessory.disabled}
						/>
					)}
				</div>
			)}
		</div>
	);
}

function MediaGallery({
	items,
}: {
	items: Array<{
		media: { url: string };
		description?: string;
		spoiler?: boolean;
	}>;
}) {
	if (items.length === 0) return null;

	const gridClass =
		items.length === 1
			? "grid-cols-1"
			: items.length === 2
				? "grid-cols-2"
				: items.length === 3
					? "grid-cols-3"
					: "grid-cols-2";

	const images = items.map((item) => ({
		src: item.media.url,
		alt: item.description ?? "",
	}));

	return (
		<div className={`grid gap-1 ${gridClass}`}>
			<ExpandableImageGallery
				images={images}
				renderImage={(image, idx, onClick) => (
					<div
						key={idx}
						className="relative cursor-pointer overflow-hidden rounded"
						onClick={onClick}
						onKeyDown={(e) => {
							if (e.key === "Enter" || e.key === " ") {
								e.preventDefault();
								onClick();
							}
						}}
						role="button"
						tabIndex={0}
					>
						<img
							src={image.src}
							alt={image.alt}
							className="h-auto w-full object-cover"
							loading="lazy"
						/>
					</div>
				)}
			/>
		</div>
	);
}

function FileComponent({ file }: { file: { url: string }; spoiler?: boolean }) {
	const filename = file.url.split("/").pop()?.split("?")[0] ?? "file";

	return (
		<a
			href={file.url}
			target="_blank"
			rel="noopener noreferrer"
			className="flex items-center gap-3 rounded bg-secondary/50 p-3 transition-colors hover:bg-secondary/80"
		>
			<File className="size-8 text-muted-foreground" />
			<div className="min-w-0 flex-1">
				<p className="truncate text-sm text-primary hover:underline">
					{filename}
				</p>
			</div>
		</a>
	);
}

function ActionRow({ components }: { components: ActionRowItem[] }) {
	return (
		<div className="flex flex-wrap gap-2">
			{components.map((comp, idx) => {
				if (comp.type === ComponentType.Button) {
					return (
						<ButtonComponent
							key={idx}
							style={comp.style}
							label={comp.label}
							url={comp.url}
							disabled={comp.disabled}
						/>
					);
				}
				if (
					comp.type === ComponentType.StringSelect ||
					comp.type === ComponentType.UserSelect
				) {
					return (
						<select
							key={idx}
							disabled={comp.disabled}
							className="rounded bg-secondary px-3 py-1.5 text-sm text-foreground"
						>
							<option>{comp.placeholder ?? "Select..."}</option>
						</select>
					);
				}
				return null;
			})}
		</div>
	);
}

function ContainerChildComponent({ child }: { child: ContainerChild }) {
	switch (child.type) {
		case ComponentType.TextDisplay:
			return <TextDisplay content={child.content} />;
		case ComponentType.Section:
			return (
				<Section components={child.components} accessory={child.accessory} />
			);
		case ComponentType.Separator:
			return <Separator divider={child.divider} spacing={child.spacing} />;
		case ComponentType.MediaGallery:
			return <MediaGallery items={child.items} />;
		case ComponentType.File:
			return <FileComponent file={child.file} spoiler={child.spoiler} />;
		case ComponentType.ActionRow:
			return <ActionRow components={child.components} />;
		default:
			return null;
	}
}

function Container({
	accentColor,
	components,
}: {
	accentColor?: number;
	spoiler?: boolean;
	components: ContainerChild[];
}) {
	return (
		<div
			className="rounded-lg border-l-4 bg-secondary/30 p-4"
			style={{
				borderLeftColor: accentColor ? numberToHex(accentColor) : "#5865F2",
			}}
		>
			<div className="space-y-2">
				{components.map((child, idx) => (
					<ContainerChildComponent key={idx} child={child} />
				))}
			</div>
		</div>
	);
}

function V2Component({ component }: { component: MessageComponent }) {
	switch (component.type) {
		case ComponentType.TextDisplay:
			return <TextDisplay content={component.content} />;
		case ComponentType.Container:
			return (
				<Container
					accentColor={component.accentColor}
					spoiler={component.spoiler}
					components={component.components}
				/>
			);
		case ComponentType.Section:
			return (
				<Section
					components={component.components}
					accessory={component.accessory}
				/>
			);
		case ComponentType.Separator:
			return (
				<Separator divider={component.divider} spacing={component.spacing} />
			);
		case ComponentType.MediaGallery:
			return <MediaGallery items={component.items} />;
		case ComponentType.File:
			return (
				<FileComponent file={component.file} spoiler={component.spoiler} />
			);
		case ComponentType.ActionRow:
			return <ActionRow components={component.components} />;
		default:
			return null;
	}
}

export function V2Components({
	components,
}: {
	components: MessageComponent[] | undefined;
}) {
	if (!components || components.length === 0) return null;

	return (
		<div className="space-y-2">
			{components.map((component, idx) => (
				<V2Component key={idx} component={component} />
			))}
		</div>
	);
}
