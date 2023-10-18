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
		recurseOutput,
		state,
	) => {
		return (
			<span key={state.key}>
				{node.content.split('\n').map((content, i) => (
					<span key={i}>
						{i > 0 && <br />}
						{content}
					</span>
				))}
			</span>
		);
		// <Emoji key={state.key} resolveNames>
		//   {node.content}
		// </Emoji>
	},
};

export default text;
