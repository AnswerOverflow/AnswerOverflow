export interface MessageOptions {
	components: V2Component[];
	files?: AttachmentFile[];
}

export interface AttachmentFile {
	url: string;
	name?: string;
	spoiler?: boolean;
}

export type V2Component =
	| TextDisplayComponent
	| ContainerComponent
	| SectionComponent
	| SeparatorComponent
	| MediaGalleryComponent
	| ThumbnailComponent
	| FileComponentData
	| ActionRowComponent;

export interface TextDisplayComponent {
	type: "textDisplay";
	content: string;
	id?: number;
}

export interface ContainerComponent {
	type: "container";
	accentColor?: number;
	spoiler?: boolean;
	components: ContainerChildComponent[];
}

export type ContainerChildComponent =
	| TextDisplayComponent
	| SectionComponent
	| SeparatorComponent
	| MediaGalleryComponent
	| FileComponentData
	| ActionRowComponent;

export interface SectionComponent {
	type: "section";
	components: TextDisplayComponent[];
	accessory?: ThumbnailComponent | SectionButtonComponent;
}

export interface SectionButtonComponent {
	type: "button";
	customId?: string;
	url?: string;
	style: "primary" | "secondary" | "success" | "danger" | "link";
	label?: string;
	emoji?: string;
	disabled?: boolean;
}

export interface SeparatorComponent {
	type: "separator";
	divider?: boolean;
	spacing?: "small" | "large";
}

export interface MediaGalleryComponent {
	type: "mediaGallery";
	items: MediaGalleryItem[];
}

export interface MediaGalleryItem {
	url: string;
	description?: string;
	spoiler?: boolean;
}

export interface ThumbnailComponent {
	type: "thumbnail";
	url: string;
	description?: string;
	spoiler?: boolean;
}

export interface FileComponentData {
	type: "file";
	url: string;
	spoiler?: boolean;
}

export interface ActionRowComponent {
	type: "actionRow";
	components: ActionRowItemOptions[];
}

export type ActionRowItemOptions =
	| MessageButtonOptions
	| MessageLinkOptions
	| MessageSelectOptions
	| MessageUserSelectOptions;

export interface MessageButtonOptions {
	type: "button";
	customId: string;
	style: "primary" | "secondary" | "success" | "danger";
	label?: string;
	emoji?: string;
	disabled?: boolean;
}

export interface MessageLinkOptions {
	type: "link";
	url: string;
	label?: string;
	emoji?: string;
	disabled?: boolean;
}

export interface MessageSelectOptions {
	type: "select";
	customId: string;
	placeholder?: string;
	disabled?: boolean;
	minValues?: number;
	maxValues?: number;
	options: Array<{
		label: string;
		value: string;
		description?: string;
		emoji?: string;
	}>;
	values?: string[];
}

export interface MessageUserSelectOptions {
	type: "userSelect";
	customId: string;
	placeholder?: string;
	disabled?: boolean;
	minValues?: number;
	maxValues?: number;
	defaultUserIds?: string[];
}

export function getOrCreateActionRow(
	options: MessageOptions,
): ActionRowComponent {
	const lastComponent = options.components[options.components.length - 1];
	if (
		lastComponent &&
		lastComponent.type === "actionRow" &&
		lastComponent.components.length < 5
	) {
		return lastComponent;
	}
	const newRow: ActionRowComponent = { type: "actionRow", components: [] };
	options.components.push(newRow);
	return newRow;
}

export function getOrCreateContainerActionRow(
	container: ContainerComponent,
): ActionRowComponent {
	const lastComponent = container.components[container.components.length - 1];
	if (
		lastComponent &&
		lastComponent.type === "actionRow" &&
		lastComponent.components.length < 5
	) {
		return lastComponent;
	}
	const newRow: ActionRowComponent = { type: "actionRow", components: [] };
	container.components.push(newRow);
	return newRow;
}
