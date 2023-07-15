import { AOHead, Button, Heading, Input } from "../primitives";
import { TextArea } from "~ui/components/primitives/base/TextArea";
export const Pricing = () => {
  const PricingElement = () => {
    return (
      <div className="flex flex-col items-center justify-center rounded-standard border-2 border-ao-white/25 p-8">
        <Heading.H2 className="text-4xl text-left w-full mb-4">Header</Heading.H2>
        <Button className={"w-full"}>Continue</Button>
      </div>
    );
  };

  return (
    <div className="my-6 sm:mx-3">
      <AOHead path="/pricing" title="Pricing" />

      <Heading.H1 className={"text-center"}>Pricing</Heading.H1>
      <Heading.H2 className="text-2xl dark:text-ao-white/90 text-center">
        Simple predictable pricing
        <br />
        Only pay for what you use.
      </Heading.H2>

      <div className="grid grid-cols-2 mx-auto w-1/2 my-32 gap-8">
        <PricingElement />
        <PricingElement />
      </div>

      <div className="my-16 flex flex-col mx-auto w-2/3 gap-4">
        <Heading.H2>Got Product feedback?</Heading.H2>
        <Input placeholder={"email (optional)"} type={"email"} autoComplete={"email"} />
        <TextArea className="h-32">test</TextArea>
        <Button>Submit</Button>
      </div>
    </div>
  );
};
