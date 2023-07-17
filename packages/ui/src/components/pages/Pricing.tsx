import { AOHead, Button, Heading, Input } from "../primitives";
import { TextArea } from "~ui/components/primitives/base/TextArea";
import { Slider } from "~ui/components/primitives/base/Slider";
import { useState } from "react";

const PRICE_FOR_1_THOUSAND = 1;

const prices = {
  0: "1k",
  1: "2k",
  2: "3k",
  3: "4k",
  4: "5k",
  5: "6k",
  6: "7k",
  7: "8k",
  8: "9k",
  9: "10k",
  10: "100k",
};

const findPrice = (price: string) => {
  return (parseInt(price.replace("k", "")) * PRICE_FOR_1_THOUSAND).toString();
};

const PricingSlider = () => {
  const [price, setPrice] = useState<string>(prices[0][0] ?? "5000");
  const [sliderVal, setSliderVal] = useState<number>(0);

  return (
    <div className="mx-auto my-32 flex w-2/3 flex-col items-center justify-center gap-8">
      <Heading.H2 className="text-5xl">${price}</Heading.H2>
      <Slider
        value={[sliderVal]}
        onValueChange={(e) => {
          if (!e[0]) {
            setPrice(findPrice(prices[0]));
            return setSliderVal(0);
          }
          const sliderStep = (e[0] / 10) as keyof typeof prices;
          setPrice(findPrice(prices[sliderStep]));
          setSliderVal(e[0]);
        }}
        step={10}
      />
    </div>
  );
};

export const Pricing = () => {
  const PricingElement = () => {
    return (
      <div className="flex flex-col items-center justify-center rounded-standard border-2 border-ao-white/25 p-8">
        <Heading.H2 className="mb-4 w-full text-left text-4xl">Header</Heading.H2>
        <Button className={"w-full"}>Continue</Button>
      </div>
    );
  };

  return (
    <div className="my-6 sm:mx-3">
      <AOHead path="/pricing" title="Pricing" />

      <Heading.H1 className={"text-center"}>Pricing</Heading.H1>
      <Heading.H2 className="text-center text-2xl dark:text-ao-white/90">
        Simple predictable pricing
        <br />
        Only pay for what you use.
      </Heading.H2>

      <div className="mx-auto my-16 grid w-1/2 grid-rows-2 gap-8 md:grid-cols-2">
        <PricingElement />
        <PricingElement />
      </div>

      <PricingSlider />

      <div className="mx-auto my-16 flex w-2/3 flex-col gap-4">
        <Heading.H2>Got Product feedback?</Heading.H2>
        <Input placeholder={"email (optional)"} type={"email"} autoComplete={"email"} />
        <TextArea className="h-32" />
        <Button>Submit</Button>
      </div>
    </div>
  );
};
