import { useRef } from "react";
import Xarrow from "react-xarrows";
import { Message, MessageProps } from "~ui/components/Message";
import { GooglePage } from "./GooglePage";

export interface NewLandingAnimationProps {
  questionMessage: MessageProps;
  answerMessage: MessageProps;
  discordChannelName: string;
}

export const NewLandingAnimation = ({
  discordChannelName,
  questionMessage,
  answerMessage,
}: NewLandingAnimationProps) => {
  const googlePageRef = useRef(null);
  const discordPageRef = useRef(null);

  return (
    <div className="flex flex-col gap-10 rounded-lg border-1 border-[#343434] bg-gradient-to-br-dark-glass px-10 py-20 shadow-[0px_0px_98px_-19px_#D4EDFF0F] backdrop-blur-md">
      {/* Discord */}
      <div className="rounded-md bg-[#36393F]">
        {/* Channel name */}
        <div className="border-b-1 border-black/50 px-5 py-2">
          <span>{discordChannelName}</span>
        </div>

        <div ref={discordPageRef}>
          <Message {...questionMessage} showLinkIcon={false} />
          <Message {...answerMessage} messageBoxClassName="rounded-b-md" showLinkIcon={false} />
        </div>
      </div>

      {/* Google */}
      <GooglePage
        result={{
          url: "https://www.answeroverflow.com > ...",
          title: "How do I index my discord channels into google?",
          description:
            "How do I index my discord channels into google? How do I index my discord channels into google? How do I index my discord channels into google?",
        }}
        ref={googlePageRef}
      />
      <Xarrow
        start={discordPageRef}
        end={googlePageRef}
        startAnchor="left"
        endAnchor={{
          position: "left",
          offset: {
            x: -40,
          },
        }}
        color="white"
        curveness={2}
      />
    </div>
  );
};
