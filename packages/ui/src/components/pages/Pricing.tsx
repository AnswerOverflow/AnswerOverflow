import { AOHead, Button, Heading, Input, LinkButton } from "../primitives";
import { TextArea } from "~ui/components/primitives/base/TextArea";
import { Slider } from "~ui/components/primitives/base/Slider";
import { useState } from "react";
import { LuCheck, LuLineChart } from "react-icons/lu";

const PricingSlider = () => {
  const [pageViews, setPageViews] = useState<number>(0);
  const [sliderVal, setSliderVal] = useState<number>(0);

  return (
    <div className="mx-auto my-32 flex w-1/3 flex-col items-center justify-center gap-8">
      <div className="w-full flex justify-between">
        <div className="flex flex-row gap-2">
          <LuLineChart className="w-6 h-6" />
          <b className="text-xl ">Page Views</b>
        </div>
        <b className="text-xl ">{pageViews.toLocaleString()}</b>
      </div>

      <Slider
        value={[sliderVal]}
        onValueChange={(e) => {
          const val = e[0]!;
          setPageViews(val);
          setSliderVal(val);
        }}
        step={10000}
        max={1000000}
      />
    </div>
  );
};

export const Pricing = () => {
  const PricingElement = (props: {
    title: string;
    cta: string;
    price: string;
    features: {
      icon?: React.ReactNode;
      name: React.ReactNode;
    }[];
    clarifications?: string[];
    ctaLink: string;
  }) => {
    return (
      <div className="flex flex-col items-center justify-start rounded-2xl border-2 dark:border-ao-white/25 border-ao-black/25 p-8 h-full">
        <div className={"flex flex-col items-start w-full justify-center h-24"}>
          <Heading.H2 className={"text-2xl my-0 py-0 font-medium"}>{props.title}</Heading.H2>
          <Heading.H3 className={"text-3xl my-0 py-0"}>{props.price}</Heading.H3>
        </div>
        <div className="h-full flex justify-between flex-col mt-8">
          <div className="flex flex-col items-center justify-between gap-4 h-full">
            <ul className="grid grid-cols-1 items-center justify-center gap-2">
              {props.features.map((feature, index) => (
                <li key={index} className="flex flex-row w-full gap-4">
                  {feature.icon ?? <LuCheck className="w-6 h-6 flex-shrink-0" />}
                  <b>{feature.name}</b>
                </li>
              ))}
            </ul>
            <div className="flex flex-col items-center justify-center gap-2">
              {props.clarifications?.map((clarification, index) => (
                <div key={index} className="flex flex-row gap-2 w-full">
                  <span>{clarification}</span>
                </div>
              ))}
            </div>
          </div>
          <LinkButton className={"w-full mt-4"} href={props.ctaLink}>
            <b>{props.cta}</b>
          </LinkButton>
        </div>
      </div>
    );
  };

  return (
    <div className="my-6 sm:mx-3">
      <AOHead
        path="/pricing"
        title="Pricing"
        description={"Index your Discord server content into Google, starting at $0/month "}
      />

      <Heading.H1 className={"text-center"}>Pricing</Heading.H1>
      <Heading.H2 className="text-center text-2xl dark:text-ao-white/90">
        Simple predictable pricing
        <br />
        Only pay for what you use.
      </Heading.H2>

      <div className="mx-auto my-16 grid w-2/3 grid-rows-2 gap-16 md:grid-cols-2">
        <PricingElement
          title={"Free"}
          cta={"Setup Now"}
          price={"$0"}
          features={[
            {
              name: "Unlimited hosting on answeroverflow.com*",
            },
            {
              name: "Basic analytics",
            },
            {
              name: "Mark questions as solved",
            },
          ]}
          clarifications={["*You can upgrade to your own domain at any time"]}
          ctaLink={"/onboarding"}
        />
        <PricingElement
          title={"Pro"}
          cta={"Start Free Trial"}
          price={"$25 / month"}
          features={[
            {
              name: "Host on your own domain up to 100,000 page views*",
            },
            {
              name: "Advanced analytics (coming soon)",
            },
            {
              name: "Priority Support",
            },
          ]}
          clarifications={["*Addition page views are billed at $0.0006 per page view"]}
          ctaLink={"/dashboard"}
        />
      </div>

      <PricingSlider />

      <div className="mx-auto my-16 flex w-2/3 flex-col gap-4">
        <Heading.H2>Pricing Feedback</Heading.H2>
        <Input placeholder={"email (optional)"} type={"email"} autoComplete={"email"} />
        <TextArea className="h-32" />
        <Button>Submit</Button>
      </div>
    </div>
  );
};
