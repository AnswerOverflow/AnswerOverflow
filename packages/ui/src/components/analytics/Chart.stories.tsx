import React from "react";
import type { Meta, StoryObj } from "@storybook/react";

import { Chart, ChartProps } from "./Chart";
const meta = {
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
    showGrid: {
      control: "boolean",
    },
    showLegend: {
      control: "boolean",
      defaultValue: true,
    },
    showTooltip: {
      control: "boolean",
      defaultValue: true,
    },
  },
} as Meta<typeof Chart>;

export default meta;

type Story = StoryObj<typeof meta>;

const lineProps: ChartProps = {
  type: "line",
  showGrid: false,
  lines: [
    {
      lineType: "monotone",
      dataKey: "uv",
      lineColor: "#8884d8",
    },
  ],
  xAxisKey: "name",
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

export const LineChart: Story = {
  render: (props: ChartProps) => (
    <div className="h-40">
      <Chart {...props} />
    </div>
  ),
  parameters: {
    a11y: {
      disable: true,
    },
  },
  // todo: fix this
  // @ts-ignore
  args: lineProps,
};

const barProps: ChartProps = {
  type: "bar",
  showGrid: false,
  bars: [
    {
      dataKey: "uv",
      barColor: "#8884d8",
    },
  ],
  xAxisKey: "name",
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

export const BarChart: Story = {
  render: (props: ChartProps) => (
    <div className="h-40">
      <Chart {...props} />
    </div>
  ),

  parameters: {
    a11y: {
      disable: true,
    },
  },
  // todo: fix this
  // @ts-ignore
  args: barProps,
};
