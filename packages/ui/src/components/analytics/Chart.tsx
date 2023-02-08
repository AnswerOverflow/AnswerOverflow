import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  LineProps,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface LineChartLine {
  lineColor: string;
  lineType: LineProps["type"];
  dataKey: string;
}

export interface LineChartData extends DefaultChartProps {
  type: "line";
  // TODO: Find type for lines
  lines: {
    lineColor: string;
    lineType: LineProps["type"];
    dataKey: string;
  }[];
}

export interface BarChartData extends DefaultChartProps {
  type: "bar";
  // TODO: Find type for lines
  bars: {
    barColor: string;
    dataKey: string;
  }[];
}

export interface DefaultChartProps {
  /**
   * Show a tooltip (when user hovers over point)
   * @default true
   */
  showTooltip?: boolean;
  /**
   * Show a grid behind the graph
   * @default false
   */
  showGrid?: boolean;
  /**
   * Show the legend (key)
   * @default true
   */
  showLegend?: boolean;
  xAxisKey?: string;
  yAxisKey?: string;

  // TODO: improve typing so it contains keys from line datakeys
  data: {
    [key in string]: string | number;
  }[];
}

export type ChartProps = LineChartData | BarChartData;

export const Chart = (props: ChartProps) => {
  const { showGrid, showTooltip, showLegend, xAxisKey, yAxisKey, data, type } = props;
  return (
    <ResponsiveContainer width={"100%"}>
      {(() => {
        switch (type) {
          case "line":
            return (
              <LineChart data={data}>
                {props.lines.map((line, index) => (
                  <Line
                    stroke={line.lineColor}
                    type={line.lineType}
                    dataKey={line.dataKey}
                    key={`line-${index}`}
                  />
                ))}

                <XAxis dataKey={xAxisKey} />
                <YAxis dataKey={yAxisKey} />

                {showGrid ? <CartesianGrid strokeDasharray="3 3" /> : null}
                {showTooltip == false ? null : <Tooltip />}
                {showLegend == false ? null : <Legend />}
              </LineChart>
            );
          case "bar":
            return (
              <BarChart data={data}>
                {props.bars.map((line, index) => (
                  <Bar fill={line.barColor} dataKey={line.dataKey} key={`bar-${index}`} />
                ))}

                <XAxis dataKey={xAxisKey} />
                <YAxis dataKey={yAxisKey} />

                {showGrid ? <CartesianGrid strokeDasharray="3 3" /> : null}
                {showTooltip == false ? null : <Tooltip />}
                {showLegend == false ? null : <Legend />}
              </BarChart>
            );
        }
      })()}
    </ResponsiveContainer>
  );
};
