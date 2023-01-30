import { ArrowTrendingUpIcon, ArrowTrendingDownIcon } from "@heroicons/react/24/outline";

export interface StatsCardProps {
  /**
   * @example "Questions asked"
   */
  subtitle: string;
  /**
   * @example "123"
   */
  stat: string;
  /**
   * @example "12.52%"
   */
  percentageChange: string;
  changeType: "increase" | "decrease";
  /**
   * The actual number/count of the change
   * @example "12"
   */
  changeCount: string;
  /**
   * @example "15 days"
   */
  changeDuration: string;
}

export const StatsCard = (props: StatsCardProps) => {
  return (
    <div className="flex w-60 flex-col items-start justify-center rounded-xl bg-white p-5 dark:bg-neutral-900 dark:text-white">
      <span className="text-xl font-light">{props.subtitle}</span>
      <span className="py-1 text-3xl font-extrabold">{props.stat}</span>
      <div className="flex items-center justify-center">
        <div className="h-6 w-6">
          {props.changeType === "increase" ? (
            <ArrowTrendingUpIcon color="green" />
          ) : (
            <ArrowTrendingDownIcon color="red" />
          )}
        </div>
        <span className="pl-2 text-sm font-medium">
          {props.percentageChange} ({props.changeCount} in {props.changeDuration})
        </span>
      </div>
    </div>
  );
};
