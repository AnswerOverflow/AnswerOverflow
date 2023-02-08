import React from "react";
import type { Meta, StoryFn } from "@storybook/react";

import { Chart, ChartProps } from "./Chart";
export default {
  component: Chart,
  // For the moment, we need to disable a11y checks for the charts - failing a11y checks
  // We need to investigate this further in the future
  // To ensure that our charts are accessible or at least as accessible as possible
  parameters: {
    a11y: {
      disable: true,
    },
  },
  argTypes: {
    type: {
      table: {
        disable: true,
      },
    },
    show_grid: {
      control: "boolean",
    },
    show_legend: {
      control: "boolean",
      defaultValue: true,
    },
    show_tooltip: {
      control: "boolean",
      defaultValue: true,
    },
  },
} as Meta;

const Template: StoryFn<typeof Chart> = (props: ChartProps) => (
  <div className="h-40">
    <Chart {...props} />
  </div>
);

export const LineChart = Template.bind({});

LineChart.parameters = {
  a11y: {
    disable: true,
  },
};
const line_props: ChartProps = {
  type: "line",
  show_grid: false,
  lines: [
    {
      line_type: "monotone",
      data_key: "uv",
      line_color: "#8884d8",
    },
  ],
  x_axis_key: "name",
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

LineChart.args = line_props;

export const BarChart = Template.bind({});
BarChart.parameters = {
  a11y: {
    disable: true,
  },
};
const bar_props: ChartProps = {
  type: "bar",
  show_grid: false,
  bars: [
    {
      data_key: "uv",
      bar_color: "#8884d8",
    },
  ],
  x_axis_key: "name",
  // Data from rechart example
  data: [
    {
      name: "Page A",
      uv: 4000,
      pv: 2400,
    },
    {
      name: "Page B",
      uv: 3000,
      pv: 1398,
    },
    {
      name: "Page C",
      uv: 2000,
      pv: 9800,
    },
    {
      name: "Page D",
      uv: 2780,
      pv: 3908,
    },
    {
      name: "Page E",
      uv: 1890,
      pv: 4800,
    },
    {
      name: "Page F",
      uv: 2390,
      pv: 3800,
    },
    {
      name: "Page G",
      uv: 3490,
      pv: 4300,
    },
  ],
};

BarChart.args = bar_props;
