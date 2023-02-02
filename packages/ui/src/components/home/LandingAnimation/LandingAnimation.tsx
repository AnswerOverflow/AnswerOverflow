import { Message, MessageProps } from "~ui/components/Message";

export interface LandingAnimationProps {
  messageData: MessageProps;
}

export const LandingAnimation = ({ messageData }: LandingAnimationProps) => {
  return (
    <div>
      <Message {...messageData} />
    </div>
  );
};
