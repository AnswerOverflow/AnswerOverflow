import React from 'react';
import { MessageProps } from './props';
import { cn } from '../utils/utils';
import { BlueLink } from '../ui/blue-link';
import { parse } from './markdown/render';
import Image from 'next/image';

const EmbedText = async (props: {
	text: string | undefined;
	className?: string;
}) => {
	if (!props.text) return null;
	const textToHTML = await parse(props.text);

	return (
		<div className={cn(`font-light text-primary`, props.className)}>
			{textToHTML}
		</div>
	);
};

const EmbedField = (
	props: NonNullable<EmbedProps['embed']['fields']>[number],
) => (
	<div className="flex flex-col gap-1">
		<EmbedText className="font-bold" text={props.name} />
		<EmbedText text={props.value} />
	</div>
);

const EmbedImage = (props: {
	url?: string;
	authorUsername: string;
	width?: number;
	height?: number;
}) => {
	if (!props.url) return null;
	return (
		<div>
			<Image
				src={props.url}
				unoptimized
				className="h-96 w-auto rounded-standard object-contain"
				width={props.width}
				height={props.height}
				// Would be nice to have proper alt text here in the future / AI generated alt text
				// (Like x's (twitter) alt text)
				alt={`From ${props.authorUsername}`}
			/>
		</div>
	);
};

export interface EmbedProps {
	embed: NonNullable<MessageProps['message']['embeds']>[number];
}

const numberToHex = (number: number | undefined) => {
	if (!number) return undefined;
	const hex = number.toString(16);
	return hex.length === 1 ? '0' + hex : hex;
};

export const Embed = (props: EmbedProps) => {
	const { embed } = props;

	return (
		<div
			className="flex w-auto flex-col gap-1 rounded-standard bg-black/5 py-2 pl-4 pr-6 dark:bg-white/10"
			style={{
				borderLeftColor: `#${numberToHex(props.embed.color)}` ?? '#FFFFFF',
				borderLeftStyle: 'solid',
				borderLeftWidth: '0.3rem',
			}}
		>
			{embed.author?.url ? (
				<BlueLink href={embed.author.url}>
					<EmbedText text={embed.author?.name} />
				</BlueLink>
			) : (
				<EmbedText text={embed.author?.name} />
			)}
			<EmbedText text={embed.provider?.name} />
			{embed.url ? (
				<BlueLink href={embed.url}>
					<EmbedText
						className="text-lg font-bold text-blue-600 hover:underline dark:text-blue-400"
						text={embed.title}
					/>
				</BlueLink>
			) : (
				<EmbedText className="text-lg font-bold" text={embed.title} />
			)}
			<EmbedText text={embed.description} />
			{embed.fields?.map((data, dataIteration) => (
				<EmbedField {...data} key={`field-${dataIteration}`} />
			))}
			<EmbedImage
				url={embed.image?.proxyUrl}
				width={embed.image?.width}
				height={embed.image?.height}
				authorUsername={embed.author?.name ?? 'An unknown user'}
			/>
			<EmbedText className="text-sm" text={embed.footer?.text} />
		</div>
	);
};
