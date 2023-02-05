import { Message, MessageProps } from "~ui/components/Message";
import { gsap } from "gsap";
import { useLayoutEffect, useRef } from "react";

export interface LandingAnimationProps {
  questionMessageData: MessageProps;
  answerMessageData: MessageProps;
}

export const LandingAnimation = ({
  questionMessageData,
  answerMessageData,
}: LandingAnimationProps) => {
  const answerRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    // const ctx = gsap.context(() => {
    //   gsap.set(answerRef.current, { height: 0 });
    //   // Slowly animate increasing the height
    //   gsap.to(answerRef.current, {
    //     height: "auto",
    //     duration: 2,
    //     ease: "power2.inOut",
    //   });
    // }, answerRef); // <- IMPORTANT! Scopes selector text
    // return () => ctx.revert(); // cleanup
  }, []);

  return (
    <div className="w-full rounded-lg border-2 p-2 drop-shadow-2xl">
      <div className="flex h-10 w-full items-center justify-center rounded-t-lg border-b-1 border-black bg-[#363636]">
        <div className="flex w-1/2 items-center justify-center rounded-md bg-[#434343]">
          <span className="flex items-center justify-center font-normal text-white">
            discord.com
          </span>
        </div>
      </div>
      <Message {...questionMessageData} darkMode={true} showLinkIcon={false} />
      <Message {...answerMessageData} darkMode={true} showLinkIcon={false} ref={answerRef} />
    </div>
  );
};
