import React from 'react';
import { MessageProps } from './props';
import { cn } from 'packages/ui/src/utils/utils';
import { BlueLink } from '../ui/blue-link';
import { parse } from './markdown/render';

const EmbedText = (props: {
	children: React.ReactNode;
	className?: string;
}) => (
	<div className={cn(`font-light text-primary`, props.className)}>
		{props.children}
	</div>
);

const EmbedField = async (
	props: NonNullable<EmbedProps['embed']['fields']>[number],
) => {
	const nameHTML = await parse(props.name);
	const valueHTML = await parse(props.value);

	return (
		<div className="flex flex-col gap-1">
			<EmbedText className="font-bold">{nameHTML}</EmbedText>
			<EmbedText>{valueHTML}</EmbedText>
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

export const Embed = async (props: EmbedProps) => {
	const { embed } = props;
	const embedAuthorNameHTML = await parse(embed.author?.name ?? '');
	const embedTitleHTML = await parse(embed.title ?? '');
	const embedDescriptionHTML = await parse(embed.description ?? '');
	const embedFooterTextHTML = await parse(embed.footer?.text ?? '');

	return (
		<div
			className="flex w-fit flex-col gap-1 rounded-standard bg-white/10 py-2 pl-4 pr-6"
			style={{
				borderLeftColor: `#${numberToHex(props.embed.color)}` ?? '#FFFFFF',
				borderLeftStyle: 'solid',
				borderLeftWidth: '0.3rem',
			}}
		>
			<EmbedText>
				{embed.author?.url ? (
					<BlueLink href={embed.author.url}>{embedAuthorNameHTML}</BlueLink>
				) : (
					embedAuthorNameHTML
				)}
			</EmbedText>
			<EmbedText className="text-xl font-bold">{embedTitleHTML}</EmbedText>
			<EmbedText>{embedDescriptionHTML}</EmbedText>
			{embed.fields?.map((data, dataIteration) => (
				<EmbedField {...data} key={`field-${dataIteration}`} />
			))}
			<EmbedText className="text-sm">{embedFooterTextHTML}</EmbedText>
		</div>
	);
};
