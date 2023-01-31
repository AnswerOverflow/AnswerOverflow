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
  line_color: string;
  line_type: LineProps["type"];
  data_key: string;
}

export interface LineChartData extends DefaultChartProps {
  type: "line";
  // TODO: Find type for lines
  lines: {
    line_color: string;
    line_type: LineProps["type"];
    data_key: string;
  }[];
}

export interface BarChartData extends DefaultChartProps {
  type: "bar";
  // TODO: Find type for lines
  bars: {
    bar_color: string;
    data_key: string;
  }[];
}

export interface DefaultChartProps {
  /**
   * Show a tooltip (when user hovers over point)
   * @default true
   */
  show_tooltip?: boolean;
  /**
   * Show a grid behind the graph
   * @default false
   */
  show_grid?: boolean;
  /**
   * Show the legend (key)
   * @default true
   */
  show_legend?: boolean;
  x_axis_key?: string;
  y_axis_key?: string;

  // TODO: improve typing so it contains keys from line datakeys
  data: {
    [key in string]: string | number;
  }[];
}

export type ChartProps = LineChartData | BarChartData;

export const Chart = (props: ChartProps) => {
  const { show_grid, show_tooltip, show_legend, x_axis_key, y_axis_key, data, type } = props;
  return (
    <ResponsiveContainer width={"100%"}>
      {(() => {
        switch (type) {
          case "line":
            return (
              <LineChart data={data}>
                {props.lines.map((line, index) => (
                  <Line
                    stroke={line.line_color}
                    type={line.line_type}
                    dataKey={line.data_key}
                    key={`line-${index}`}
                  />
                ))}

                <XAxis dataKey={x_axis_key} />
                <YAxis dataKey={y_axis_key} />

                {show_grid ? <CartesianGrid strokeDasharray="3 3" /> : null}
                {show_tooltip == false ? null : <Tooltip />}
                {show_legend == false ? null : <Legend />}
              </LineChart>
            );
          case "bar":
            return (
              <BarChart data={data}>
                {props.bars.map((line, index) => (
                  <Bar fill={line.bar_color} dataKey={line.data_key} key={`bar-${index}`} />
                ))}

                <XAxis dataKey={x_axis_key} />
                <YAxis dataKey={y_axis_key} />

                {show_grid ? <CartesianGrid strokeDasharray="3 3" /> : null}
                {show_tooltip == false ? null : <Tooltip />}
                {show_legend == false ? null : <Legend />}
              </BarChart>
            );
        }
      })()}
    </ResponsiveContainer>
  );
};
