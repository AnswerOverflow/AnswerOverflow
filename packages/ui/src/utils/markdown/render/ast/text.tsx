// import Emoji from '@ui/shared/Emoji'
import SimpleMarkdown from 'simple-markdown';

const text = {
	...SimpleMarkdown.defaultRules.text,
	parse: ([content], recurseParse, state) =>
		state.nested
			? { content }
			: recurseParse(content, {
					...state,
					nested: true,
			  }),

	react: (
		node: {
			content: string;
		},
		recurseOutput: any,
		state: {
			key: string;
		},
	) => {
		const splitOnSpaces = node.content.split(' ');
		let areAnyEmojis = false;
		const contentWithEmojis = splitOnSpaces.map((word) => {
			const match = word.match(/(&lt;|<)(a?):[a-zA-Z0-9-]+:\d+(&gt;|>)/g);
			if (match) {
				areAnyEmojis = true;
				const emoji = match[0]
					.replace(/&lt;/g, '')
					.replace(/&gt;/g, '')
					.replace(/</g, '')
					.replace(/>/g, '');
				const [animatedToken, emojiName, emojiId] = emoji.split(':');
				return {
					type: 'emoji',
					animated: !!animatedToken,
					name: emojiName,
					id: emojiId,
				} as const;
			} else {
				return {
					type: 'text',
					content: word,
				} as const;
			}
		});

		if (!areAnyEmojis) {
			return <span key={state.key}>{node.content}</span>;
		}
		return contentWithEmojis.map((content, index) => {
			if (content.type === 'emoji' && content.id) {
				return (
					<img
						src={`https://cdn.discordapp.com/emojis/${content.id}.${
							content.animated ? 'gif' : 'png'
						}`}
						className={'inline-block h-[22px] w-[22px]'}
						key={index}
						alt={content.name ?? 'Emoji'}
					/>
				);
			}
			let contentWithSpace =
				index > 0 ? `  ${content.content ?? ''}` : content.content;
			if (contentWithEmojis[index + 1]?.type === 'emoji') {
				contentWithSpace += ' ';
			}
			return <span key={index}>{contentWithSpace}</span>;
		});
	},
};

export default text;