import React from 'react';
import { MessageProps } from './props';
import { cn } from 'packages/ui/src/utils/utils';
import { BlueLink } from '../ui/blue-link';

const EmbedText = (props: {
	children: React.ReactNode;
	className?: string;
}) => (
	<span className={cn(`text-primary font-light`, props.className)}>
		{props.children}
	</span>
);

const EmbedField = (
	props: NonNullable<EmbedProps['embed']['fields']>[number],
) => (
	<div className="flex flex-col gap-1">
		<EmbedText className="font-bold">{props.name}</EmbedText>
		<EmbedText>{props.value}</EmbedText>
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
			className="flex flex-col w-fit bg-white/10 rounded-standard pl-4 pr-6 gap-1 py-2"
			style={{
				borderLeftColor: `#${numberToHex(props.embed.color)}` ?? '#FFFFFF',
				borderLeftStyle: 'solid',
				borderLeftWidth: '0.3rem',
			}}
		>
			<EmbedText>
				{embed.author?.url ? (
					<BlueLink href={embed.author.url}>{embed.author.name}</BlueLink>
				) : (
					embed.author?.name
				)}
			</EmbedText>
			<EmbedText className="font-bold text-xl">{embed.title}</EmbedText>
			<EmbedText>{embed.description}</EmbedText>
			{embed.fields?.map((data, dataIteration) => (
				<EmbedField {...data} key={`field-${dataIteration}`} />
			))}
			<EmbedText className="text-sm">{embed.footer?.text}</EmbedText>
		</div>
	);
};
