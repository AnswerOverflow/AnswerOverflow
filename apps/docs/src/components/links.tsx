import Link from "next/link";
import { DISCORD_LINK } from "@answeroverflow/constants";

export const AnswerOverflowServerInviteLink = () => (
  <Link
    // eslint-disable-next-line tailwindcss/no-custom-classname
    className="nx-text-primary-600 nx-underline nx-decoration-from-font [text-underline-position:from-font]"
    href={DISCORD_LINK}
  >
    Answer Overflow
  </Link>
);

export const TryLiveDemo = () => (
  <>
    Join the <AnswerOverflowServerInviteLink /> Discord server to try this with 0 setup.
  </>
);
