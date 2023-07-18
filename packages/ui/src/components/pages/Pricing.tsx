import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  AOHead,
  Button,
  Heading,
  Input,
  LinkButton,
} from "../primitives";
import { TextArea } from "~ui/components/primitives/base/TextArea";
import { Slider } from "~ui/components/primitives/base/Slider";
import { useState } from "react";
import { LuCheck, LuLineChart } from "react-icons/lu";
import { trackEvent } from "@answeroverflow/hooks";
import { toast } from "react-toastify";

const faqs: {
  question: React.ReactNode;
  answer: React.ReactNode;
}[] = [
  {
    question: "What happens if I go over my page view limits?",
    answer: (
      <span>
        <b>Your site will not be immediately taken down.</b> We will reach out to you to figure out
        a plan that works for you. If you are consistently going over your page view limits, we will
        ask you to upgrade to a higher plan.
      </span>
    ),
  },
  {
    question: "How are page views calculated?",
    answer:
      "Page views are based off of total views, not unique views. If one person views your pages 30 times and another views it 20 times, your total for page views will be 50. Page views are any page that can be viewed, for instance your homepage (/), your search page (/search) and any question pages (/m/messageId).",
  },
  {
    question: "What if someone spams my site?",
    answer:
      "If your site is DDoSed / page views are increased by some form of artificial usage, you will not be billed for that.",
  },
  {
    question: "What plan is right for me?",
    answer:
      "If you’re a company using Discord to manage your community support, the Pro plan is the best fit as you get to keep all of your branding the same by hosting on your own domain. If you’re a smaller community, the free plan should work well while you get started.",
  },
  {
    question: "What if I cancel my subscription?",
    answer:
      "We’ll work with you to figure out next steps to persist your content. Currently the only option is to leave your custom domain set and we will redirect from your domain back to answeroverflow.com. In the future, you will be able to self host Answer Overflow and this will be an alternative option. Our goal is to make sure all of your content stays active and working.",
  },
  {
    question:
      "What happens if I have content indexed on answeroverflow.com and I upgrade to my own domain?",
    answer:
      "All of your pages on answeroveroverflow are set as a permanent redirect to your new domain. Any visitors while the answeroverflow.com pages are still indexed in Google will be redirected to your custom domain. Eventually they will drop off and only your site will be  in search results.",
  },
  {
    question:
      "Why are my pages on answeroverflow.com doing a temporary redirect rather than a permanent one?",
    answer:
      "For the duration of your trial, your content will be doing a temporary redirect rather than a permanent redirect. This is to prevent having a lot of dead links in the event that you do not renew your subscription after your trial ends. When you're on the Pro plan, your pages do a permanent redirect.",
  },
];

const PricingFAQ = () => (
  <Accordion type="multiple" className="w-full my-16">
    {faqs.map((faq, i) => (
      <AccordionItem value={`item-${faq.question}`} key={i}>
        <AccordionTrigger>{faq.question}</AccordionTrigger>
        <AccordionContent>{faq.answer}</AccordionContent>
      </AccordionItem>
    ))}
  </Accordion>
);

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
                {feature.name}
              </li>
            ))}
          </ul>
          <div className="flex flex-col items-center justify-center gap-2">
            {props.clarifications?.map((clarification, index) => (
              <div
                key={index}
                className="flex flex-row gap-2 w-full dark:text-neutral-400 text-neutral-600"
              >
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

const PricingOptions = () => (
  <div className="mx-auto my-16 grid  grid-cols-1 gap-16 md:grid-cols-3">
    <PricingElement
      title={"Free"}
      cta={"Setup Now"}
      price={"$0"}
      features={[
        {
          name: "Hosted on answeroverflow.com",
        },
        {
          name: "Up to 50,000 monthly page views",
        },
      ]}
      clarifications={[
        "Upgrade to your own domain at any time and your content will be redirected",
      ]}
      ctaLink={"/onboarding"}
    />
    <PricingElement
      title={"Pro"}
      cta={"Start Free Trial"}
      price={"$25 / month"}
      features={[
        {
          name: "Hosted on your own domain",
        },
        {
          name: "Up to 100,000 monthly page views",
        },
        {
          name: "Basic analytics (coming soon)",
        },
      ]}
      ctaLink={"/dashboard"}
    />
    <PricingElement
      title={"Enterprise"}
      cta={"Start Free Trial"}
      price={"$150 / month"}
      features={[
        {
          name: "300k monthly page views on your own domains",
        },
        {
          name: "Advanced analytics (coming soon)",
        },
        {
          name: "Priority support",
        },
      ]}
      ctaLink={"/dashboard"}
      clarifications={[
        "If you need more than 300k page views, we will work with you to figure out a custom plan",
      ]}
    />
  </div>
);

export const Pricing = () => {
  return (
    <div className="my-6 sm:mx-3 max-w-6xl md:mx-auto">
      <AOHead
        path="/pricing"
        title="Pricing"
        description={"Index your Discord server content into Google, starting at $0/month "}
      />

      <Heading.H1 className={"text-center"}>Plans</Heading.H1>
      <PricingOptions />
      <PricingFAQ />
      <form
        className="mx-auto my-16 flex  flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          // @ts-ignore
          const [emailElement, feedbackElement] = e.target;
          const email = (emailElement as HTMLInputElement).value;
          const feedback = (feedbackElement as HTMLTextAreaElement).value;
          trackEvent("Pricing Feedback", {
            email,
            feedback,
          });
          toast.success("Feedback submitted thanks!");
        }}
      >
        <Heading.H2>Pricing Feedback</Heading.H2>
        <Input placeholder={"email (optional)"} type={"email"} autoComplete={"email"} />
        <TextArea
          className="h-32"
          placeholder={"What do you think of our pricing? What would you like to see?"}
          minLength={1}
          required
          inputMode={"text"}
        />
        <Button>Submit</Button>
      </form>
    </div>
  );
};
