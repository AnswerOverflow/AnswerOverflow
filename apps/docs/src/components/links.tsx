import Link from "next/link";
import { DISCORD_LINK } from "@answeroverflow/constants";
import { Callout } from "nextra-theme-docs";
export const AnswerOverflowServerInviteLink = () => (
  <Link
    // eslint-disable-next-line tailwindcss/no-custom-classname
    className="nx-text-primary-600 nx-underline nx-decoration-from-font [text-underline-position:from-font]"
    href={DISCORD_LINK}
  >
    Answer Overflow Discord
  </Link>
);

export const TryLiveDemo = () => (
  <Callout type="info">
    Join the <AnswerOverflowServerInviteLink /> server to try this with 0 setup.
  </Callout>
);
