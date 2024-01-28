import React from 'react';
import { MessageProps } from './props';
import { cn } from 'packages/ui/src/utils/utils';
import { BlueLink } from '../ui/blue-link';
import { parse } from './markdown/render';

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
			className="flex w-fit flex-col gap-1 rounded-standard bg-black/5 dark:bg-white/10 py-2 pl-4 pr-6"
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

			<EmbedText className="text-xl font-bold" text={embed.title} />
			<EmbedText text={embed.description} />
			{embed.fields?.map((data, dataIteration) => (
				<EmbedField {...data} key={`field-${dataIteration}`} />
			))}
			<EmbedText className="text-sm" text={embed.footer?.text} />
		</div>
	);
};
