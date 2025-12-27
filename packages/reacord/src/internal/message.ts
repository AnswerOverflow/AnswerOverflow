import { last } from "./helpers";

export interface Message {
	edit(options: MessageOptions): Promise<void>;
	delete(): Promise<void>;
}

export interface MessageOptions {
	content: string;
	embeds: EmbedOptions[];
	actionRows: ActionRowOptions[];
	files?: MessageFileOptions[];
}

export interface MessageFileOptions {
	url: string;
	spoiler?: boolean;
}

export interface EmbedOptions {
	title?: string;
	description?: string;
	url?: string;
	color?: number;
	fields?: Array<{ name: string; value: string; inline?: boolean }>;
	author?: { name: string; url?: string; icon_url?: string };
	thumbnail?: { url: string };
	image?: { url: string };
	footer?: { text: string; icon_url?: string };
	timestamp?: string;
}

export type ActionRowOptions = ActionRowItemOptions[];

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

export function getNextActionRow(options: MessageOptions): ActionRowOptions {
	const lastRow = last(options.actionRows);
	if (lastRow && lastRow.length < 5) {
		return lastRow;
	}
	const newRow: ActionRowOptions = [];
	options.actionRows.push(newRow);
	return newRow;
}
