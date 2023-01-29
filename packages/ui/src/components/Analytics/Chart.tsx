import {
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

export interface LineChartData {
  type: "line";
  lines: any[];
  data: any[];
}

export type ChartProps = LineChartData;

export const Chart = (props: ChartProps) => {
  return (
    <ResponsiveContainer width={"100%"}>
      {props.type === "line" ? (
        <LineChart data={props.data}>
          {props.lines.map((line, index) => (
            <Line key={index} {...line} />
          ))}
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
        </LineChart>
      ) : (
        <></>
      )}
    </ResponsiveContainer>
  );
};

// Example of discrimnated union
// https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions
