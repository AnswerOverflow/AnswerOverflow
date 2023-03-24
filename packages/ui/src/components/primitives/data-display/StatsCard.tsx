import {
	ArrowTrendingUpIcon,
	ArrowTrendingDownIcon,
} from '@heroicons/react/24/outline';

export interface StatsCardProps {
	/**
	 * @example "Questions asked"
	 */
	title: string;
	/**
	 * @example "123"
	 */
	stat: string;
	/**
	 * @example "12.52%"
	 */
	percentageChange: string;
	changeType: 'increase' | 'decrease';
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

export const StatsCard = ({
	title,
	stat,
	percentageChange,
	changeType,
	changeCount,
	changeDuration,
}: StatsCardProps) => {
	return (
		<div className="flex w-60 flex-col items-start justify-center rounded-xl bg-white p-5 dark:bg-neutral-900 dark:text-white">
			<span className="text-xl font-light">{title}</span>
			<span className="py-1 text-3xl font-extrabold">{stat}</span>
			<div className="flex items-center justify-center">
				<div className="h-6 w-6">
					{changeType === 'increase' ? (
						<ArrowTrendingUpIcon color="green" />
					) : (
						<ArrowTrendingDownIcon color="red" />
					)}
				</div>
				<span className="pl-2 text-sm font-medium">
					{percentageChange} ({changeCount} in {changeDuration})
				</span>
			</div>
		</div>
	);
};
