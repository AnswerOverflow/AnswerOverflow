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
  percentage_change: string;
  change_type: "increase" | "decrease";
  /**
   * The actual number/count of the change
   * @example "12"
   */
  change_count: string;
  /**
   * @example "15 days"
   */
  change_duration: string;
}

export const StatsCard = ({
  subtitle,
  stat,
  percentage_change,
  change_type,
  change_count,
  change_duration,
}: StatsCardProps) => {
  return (
    <div className="flex w-60 flex-col items-start justify-center rounded-xl bg-white p-5 dark:bg-neutral-900 dark:text-white">
      <span className="text-xl font-light">{subtitle}</span>
      <span className="py-1 text-3xl font-extrabold">{stat}</span>
      <div className="flex items-center justify-center">
        <div className="h-6 w-6">
          {change_type === "increase" ? (
            <ArrowTrendingUpIcon color="green" />
          ) : (
            <ArrowTrendingDownIcon color="red" />
          )}
        </div>
        <span className="pl-2 text-sm font-medium">
          {percentage_change} ({change_count} in {change_duration})
        </span>
      </div>
    </div>
  );
};
