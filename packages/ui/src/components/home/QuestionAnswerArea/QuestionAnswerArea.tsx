import { useRef } from "react";
import Xarrow from "react-xarrows";
import { Message, MessageProps } from "~ui/components/home/DemoMessage";
import { useTheme } from "~ui/utils/hooks";
import { GooglePage } from "./GooglePage/GooglePage";
import "./DashAnimation.css";

export interface NewLandingAnimationProps {
  questionMessage: MessageProps;
  answerMessage: MessageProps;
  discordChannelName: string;
}

export const QuestionAnswerArea = ({
  discordChannelName,
  questionMessage,
  answerMessage,
}: NewLandingAnimationProps) => {
  const googlePageRef = useRef(null);
  const discordPageRef = useRef(null);
  const theme = useTheme();

  return (
    <>
      <div className="flex flex-col gap-10 rounded-lg border-1 border-[#C5C5C5] bg-gradient-to-br-light-glass py-20 pl-16 pr-8 shadow-[0px_0px_98px_-19px_#D4EDFF0F] backdrop-blur-md dark:border-[#343434] dark:bg-gradient-to-br-dark-glass xl:py-10 2xl:py-12">
        {/* Discord */}
        <div className="rounded-md bg-[#36393F]" ref={discordPageRef}>
          {/* Channel name */}
          <div className="border-b-1 border-black/50 px-5 py-2">
            <span className="text-white">{discordChannelName}</span>
          </div>

          <div ref={discordPageRef}>
            <Message {...questionMessage} showLinkIcon={false} forceDarkMode={true} />
            <Message
              {...answerMessage}
              additionalMessageBoxClassNames="rounded-b-md"
              showLinkIcon={false}
              forceDarkMode={true}
            />
          </div>
        </div>

        {/* Google */}
        <GooglePage
          result={{
            url: "https://www.answeroverflow.com > ...",
            title: "How do I index my discord channels into google?",
            // TODO: Add description, will require arrow offsets to be changed
            description:
              "How do I index my discord channels into google? How do I index my discord channels into google? How do I index my discord channels into google?",
          }}
          ref={googlePageRef}
        />
      </div>
      <div className="arrow">
        <Xarrow
          start={discordPageRef}
          end={googlePageRef}
          color={theme === "dark" ? "white" : "black"}
          strokeWidth={3}
          startAnchor={"left"}
          endAnchor={{
            position: "auto",
            offset: { x: -18, y: 0 },
          }}
          dashness={true}
          curveness={2}
          _cpx1Offset={-60}
          _cpx2Offset={-60}
        />
      </div>
    </>
  );
};
