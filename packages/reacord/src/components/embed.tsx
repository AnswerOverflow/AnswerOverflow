import type { ReactNode } from "react";
import { ReacordElement } from "../internal/element";
import { omit, snakeCaseDeep } from "../internal/helpers";
import type { EmbedOptions, MessageOptions } from "../internal/message";
import { Node } from "../internal/node";
import { TextNode } from "../internal/text-node";

abstract class EmbedChildNode<Props> extends Node<Props> {
	abstract modifyEmbedOptions(options: EmbedOptions): void;
}

export interface EmbedProps {
	title?: string;
	description?: string;
	url?: string;
	color?: number;
	fields?: Array<{ name: string; value: string; inline?: boolean }>;
	author?: { name: string; url?: string; iconUrl?: string };
	thumbnail?: { url: string };
	image?: { url: string };
	footer?: { text: string; iconUrl?: string };
	timestamp?: string | number | Date;
	children?: ReactNode;
}

export function Embed(props: EmbedProps) {
	return (
		<ReacordElement props={props} createNode={(p) => new EmbedNode(p)}>
			{props.children}
		</ReacordElement>
	);
}

class EmbedNode extends Node<EmbedProps> {
	override modifyMessageOptions(options: MessageOptions): void {
		const embed: EmbedOptions = {
			...snakeCaseDeep(omit(this.props ?? {}, ["children", "timestamp"])),
			timestamp: this.props.timestamp
				? new Date(this.props.timestamp).toISOString()
				: undefined,
		};

		for (const child of this.children) {
			if (child instanceof EmbedChildNode) {
				child.modifyEmbedOptions(embed);
			}
			if (child instanceof TextNode) {
				embed.description = (embed.description ?? "") + child.props;
			}
		}

		options.embeds.push(embed);
	}
}

export interface EmbedFieldProps {
	name: string;
	inline?: boolean;
	children?: ReactNode;
}

export function EmbedField(props: EmbedFieldProps) {
	return (
		<ReacordElement props={props} createNode={(p) => new EmbedFieldNode(p)}>
			{props.children}
		</ReacordElement>
	);
}

class EmbedFieldNode extends EmbedChildNode<EmbedFieldProps> {
	override modifyEmbedOptions(options: EmbedOptions): void {
		options.fields = options.fields ?? [];
		options.fields.push({
			name: this.props.name,
			value: this.text,
			inline: this.props.inline,
		});
	}
}

export interface EmbedTitleProps {
	children?: ReactNode;
}

export function EmbedTitle(props: EmbedTitleProps) {
	return (
		<ReacordElement props={props} createNode={(p) => new EmbedTitleNode(p)}>
			{props.children}
		</ReacordElement>
	);
}

class EmbedTitleNode extends EmbedChildNode<EmbedTitleProps> {
	override modifyEmbedOptions(options: EmbedOptions): void {
		options.title = this.text;
	}
}

export interface EmbedAuthorProps {
	name?: string;
	url?: string;
	iconUrl?: string;
	children?: ReactNode;
}

export function EmbedAuthor(props: EmbedAuthorProps) {
	return (
		<ReacordElement props={props} createNode={(p) => new EmbedAuthorNode(p)}>
			{props.children}
		</ReacordElement>
	);
}

class EmbedAuthorNode extends EmbedChildNode<EmbedAuthorProps> {
	override modifyEmbedOptions(options: EmbedOptions): void {
		options.author = {
			name: this.props.name ?? this.text,
			url: this.props.url,
			icon_url: this.props.iconUrl,
		};
	}
}

export interface EmbedFooterProps {
	text?: string;
	iconUrl?: string;
	children?: ReactNode;
}

export function EmbedFooter(props: EmbedFooterProps) {
	return (
		<ReacordElement props={props} createNode={(p) => new EmbedFooterNode(p)}>
			{props.children}
		</ReacordElement>
	);
}

class EmbedFooterNode extends EmbedChildNode<EmbedFooterProps> {
	override modifyEmbedOptions(options: EmbedOptions): void {
		options.footer = {
			text: this.props.text ?? this.text,
			icon_url: this.props.iconUrl,
		};
	}
}

export interface EmbedImageProps {
	url: string;
}

export function EmbedImage(props: EmbedImageProps) {
	return (
		<ReacordElement props={props} createNode={(p) => new EmbedImageNode(p)} />
	);
}

class EmbedImageNode extends EmbedChildNode<EmbedImageProps> {
	override modifyEmbedOptions(options: EmbedOptions): void {
		options.image = { url: this.props.url };
	}
}

export interface EmbedThumbnailProps {
	url: string;
}

export function EmbedThumbnail(props: EmbedThumbnailProps) {
	return (
		<ReacordElement
			props={props}
			createNode={(p) => new EmbedThumbnailNode(p)}
		/>
	);
}

class EmbedThumbnailNode extends EmbedChildNode<EmbedThumbnailProps> {
	override modifyEmbedOptions(options: EmbedOptions): void {
		options.thumbnail = { url: this.props.url };
	}
}
