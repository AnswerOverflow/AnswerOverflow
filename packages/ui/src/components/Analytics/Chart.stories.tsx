import React from "react";
import type { ComponentStory, Meta } from "@storybook/react";

import { Chart, ChartProps } from "./Chart";
export default {
  component: Chart,
} as Meta;

//👇 We create a “template” of how args map to rendering
const Template: ComponentStory<typeof Chart> = (props: ChartProps) => <Chart {...props} />;

//👇 Each story then reuses that template

export const Primary = Template.bind({});
//👇 Each story then reuses that template
const primProps: ChartProps = {
  type: "line",
  lines: [
    {
      type: "monotone",
      dataKey: "uv",
      stroke: "#8884d8",
    },
  ],
  // Data from rechart example
  data: [
    {
      name: "Page A",
      uv: 4000,
      pv: 2400,
      amt: 2400,
    },
    {
      name: "Page B",
      uv: 3000,
      pv: 1398,
      amt: 2210,
    },
    {
      name: "Page C",
      uv: 2000,
      pv: 9800,
      amt: 2290,
    },
    {
      name: "Page D",
      uv: 2780,
      pv: 3908,
      amt: 2000,
    },
    {
      name: "Page E",
      uv: 1890,
      pv: 4800,
      amt: 2181,
    },
    {
      name: "Page F",
      uv: 2390,
      pv: 3800,
      amt: 2500,
    },
    {
      name: "Page G",
      uv: 3490,
      pv: 4300,
      amt: 2100,
    },
  ],
};

Primary.args = primProps;
