import Link from '@answeroverflow/ui/src/ui/link';
import { DISCORD_LINK } from '@answeroverflow/constants';
import { Callout } from 'nextra-theme-docs';
export const NextraStyledLink = ({
	text,
	href,
}: {
	text: string;
	href: string;
}) => (
	<Link
		// eslint-disable-next-line tailwindcss/no-custom-classname
		className="nx-text-primary-600 nx-underline nx-decoration-from-font [text-underline-position:from-font]"
		href={href}
	>
		{text}
	</Link>
);

export const AnswerOverflowServerInviteLink = () => (
	<Link
		// eslint-disable-next-line tailwindcss/no-custom-classname
		className="nx-text-primary-600 nx-underline nx-decoration-from-font [text-underline-position:from-font]"
		href={DISCORD_LINK}
	>
		Answer Overflow Discord server
	</Link>
);

export const TryLiveDemo = () => (
	<Callout type="info">
		Join the <AnswerOverflowServerInviteLink /> to try this in a live channel
		with no setup.
	</Callout>
);
