import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

export interface LineChartData {
  type: "line";
  // TODO: Find type for lines
  lines: LineChartLine[];
  // TODO: improve typing so it contains keys from line datakeys
  data: any[];
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
}

export type ChartProps = LineChartData;

export const Chart = (props: ChartProps) => {
  return (
    <ResponsiveContainer width={"100%"}>
      {props.type === "line" ? (
        <LineChart data={props.data}>
          {props.lines.map((line, index) => (
            <Line
              stroke={line.lineColor}
              type={line.lineType}
              dataKey={line.dataKey}
              key={`line-${index}`}
            />
          ))}
          <XAxis dataKey={props.xAxisKey} />
          <YAxis dataKey={props.yAxisKey} />

          {props.showGrid ? <CartesianGrid strokeDasharray="3 3" /> : null}
          {props.showTooltip == false ? null : <Tooltip />}
          {props.showLegend == false ? null : <Legend />}
        </LineChart>
      ) : (
        <></>
      )}
    </ResponsiveContainer>
  );
};
