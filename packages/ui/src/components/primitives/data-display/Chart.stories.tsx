import React from 'react';
import type { Story } from '@ladle/react';
import { Chart, type ChartProps } from './Chart';

// Todo: disable a11y
const LineChart: Story<ChartProps> = (props) => (
  <div className='h-40'>
    <Chart {...props} />
  </div>
)

LineChart.args = {
  type: 'line',
  showGrid: false,
  lines: [
    {
      lineType: 'monotone',
      dataKey: 'uv',
      lineColor: '#8884d8',
    },
  ],
  xAxisKey: 'name',
  // Data from rechart example
  data: [
    {
      name: 'Page A',
      uv: 4000,
      pv: 2400,
      amt: 2400,
    },
    {
      name: 'Page B',
      uv: 3000,
      pv: 1398,
      amt: 2210,
    },
    {
      name: 'Page C',
      uv: 2000,
      pv: 9800,
      amt: 2290,
    },
    {
      name: 'Page D',
      uv: 2780,
      pv: 3908,
      amt: 2000,
    },
    {
      name: 'Page E',
      uv: 1890,
      pv: 4800,
      amt: 2181,
    },
    {
      name: 'Page F',
      uv: 2390,
      pv: 3800,
      amt: 2500,
    },
    {
      name: 'Page G',
      uv: 3490,
      pv: 4300,
      amt: 2100,
    },
  ],
};

export const BarChart = LineChart.bind({})

BarChart.args = {
  type: 'bar',
  showGrid: false,
  bars: [
    {
      dataKey: 'uv',
      barColor: '#8884d8',
    },
  ],
  xAxisKey: 'name',
  // Data from rechart example
  data: [
    {
      name: 'Page A',
      uv: 4000,
      pv: 2400,
    },
    {
      name: 'Page B',
      uv: 3000,
      pv: 1398,
    },
    {
      name: 'Page C',
      uv: 2000,
      pv: 9800,
    },
    {
      name: 'Page D',
      uv: 2780,
      pv: 3908,
    },
    {
      name: 'Page E',
      uv: 1890,
      pv: 4800,
    },
    {
      name: 'Page F',
      uv: 2390,
      pv: 3800,
    },
    {
      name: 'Page G',
      uv: 3490,
      pv: 4300,
    },
  ],
};

