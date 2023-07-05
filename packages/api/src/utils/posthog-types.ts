/* eslint-disable @typescript-eslint/naming-convention */
export enum FilterLogicalOperator {
	And = 'AND',
	Or = 'OR',
}
export interface PropertyGroupFilterValue {
	type: FilterLogicalOperator;
	values: (AnyPropertyFilter | PropertyGroupFilterValue)[];
}

export enum InsightType {
	TRENDS = 'TRENDS',
	STICKINESS = 'STICKINESS',
	LIFECYCLE = 'LIFECYCLE',
	FUNNELS = 'FUNNELS',
	RETENTION = 'RETENTION',
	PATHS = 'PATHS',
	JSON = 'JSON',
	SQL = 'SQL',
}

export interface PropertyGroupFilter {
	type: FilterLogicalOperator;
	values: PropertyGroupFilterValue[];
}
export type IntervalType = 'hour' | 'day' | 'week' | 'month';
export type BreakdownType = 'cohort' | 'person' | 'event' | 'group' | 'session';
export interface Breakdown {
	property: string | number;
	type: BreakdownType;
	normalize_url?: boolean;
}
export type BreakdownKeyType = string | number | (string | number)[] | null;

export enum ChartDisplayType {
	ActionsLineGraph = 'ActionsLineGraph',
	ActionsLineGraphCumulative = 'ActionsLineGraphCumulative',
	ActionsAreaGraph = 'ActionsAreaGraph',
	ActionsTable = 'ActionsTable',
	ActionsPie = 'ActionsPie',
	ActionsBar = 'ActionsBar',
	ActionsBarValue = 'ActionsBarValue',
	WorldMap = 'WorldMap',
	BoldNumber = 'BoldNumber',
}
export interface FilterType {
	// used by all
	from_dashboard?: boolean | number;
	insight?: InsightType;
	filter_test_accounts?: boolean;
	properties?: AnyPropertyFilter[] | PropertyGroupFilter;
	sampling_factor?: number | null;

	date_from?: string | null;
	date_to?: string | null;
	/**
	 * Whether the `date_from` and `date_to` should be used verbatim. Disables rounding to the start and end of period.
	 * Strings are cast to bools, e.g. "true" -> true.
	 */
	explicit_date?: boolean | string | null;

	events?: Record<string, any>[];
	actions?: Record<string, any>[];
	new_entity?: Record<string, any>[];

	// persons modal
	entity_id?: string | number;
	entity_type?: EntityType;
	entity_math?: string;

	// used by trends and stickiness
	interval?: IntervalType;
	// TODO: extract into TrendsFunnelsCommonFilterType
	breakdown_type?: BreakdownType | null;
	breakdown?: BreakdownKeyType;
	breakdown_normalize_url?: boolean;
	breakdowns?: Breakdown[];
	breakdown_group_type_index?: number | null;
	aggregation_group_type_index?: number; // Groups aggregation
}

export type PropertyFilterValue = string | number | (string | number)[] | null;

export interface RecordingDurationFilter extends BasePropertyFilter {
	type: PropertyFilterType.Recording;
	key: 'duration';
	value: number;
	operator: PropertyOperator;
}

export enum ShownAsValue {
	VOLUME = 'Volume',
	STICKINESS = 'Stickiness',
	LIFECYCLE = 'Lifecycle',
}

const formats = [
	'numeric',
	'duration',
	'duration_ms',
	'percentage',
	'percentage_scaled',
] as const;
export type AggregationAxisFormat = (typeof formats)[number];

export interface TrendsFilterType extends FilterType {
	// Specifies that we want to smooth the aggregation over the specified
	// number of intervals, e.g. for a day interval, we may want to smooth over
	// 7 days to remove weekly variation. Smoothing is performed as a moving average.
	smoothing_intervals?: number;
	show_legend?: boolean; // used to show/hide legend next to insights graph
	hidden_legend_keys?: Record<string, boolean | undefined>; // used to toggle visibilities in table and legend
	compare?: boolean;
	aggregation_axis_format?: AggregationAxisFormat; // a fixed format like duration that needs calculation
	aggregation_axis_prefix?: string; // a prefix to add to the aggregation axis e.g. £
	aggregation_axis_postfix?: string; // a postfix to add to the aggregation axis e.g. %
	formula?: string;
	shown_as?: ShownAsValue;
	display?: ChartDisplayType;
	show_values_on_series?: boolean;
	breakdown_histogram_bin_count?: number; // trends breakdown histogram bin count
}
interface BasePropertyFilter {
	key: string;
	value?: PropertyFilterValue;
	label?: string;
	type?: PropertyFilterType;
}

export enum PropertyOperator {
	Exact = 'exact',
	IsNot = 'is_not',
	IContains = 'icontains',
	NotIContains = 'not_icontains',
	Regex = 'regex',
	NotRegex = 'not_regex',
	GreaterThan = 'gt',
	GreaterThanOrEqual = 'gte',
	LessThan = 'lt',
	LessThanOrEqual = 'lte',
	IsSet = 'is_set',
	IsNotSet = 'is_not_set',
	IsDateExact = 'is_date_exact',
	IsDateBefore = 'is_date_before',
	IsDateAfter = 'is_date_after',
	Between = 'between',
	NotBetween = 'not_between',
	Minimum = 'min',
	Maximum = 'max',
}

export enum PropertyFilterType {
	/** Event metadata and fields on the clickhouse events table */
	Meta = 'meta',
	/** Event properties */
	Event = 'event',
	/** Person properties */
	Person = 'person',
	Element = 'element',
	/** Event property with "$feature/" prepended */
	Feature = 'feature',
	Session = 'session',
	Cohort = 'cohort',
	Recording = 'recording',
	Group = 'group',
	HogQL = 'hogql',
}

export interface Person {
	url: string;
	filter: Partial<FilterType>;
}

export type EntityType = 'actions' | 'events' | 'new_entity';

export interface Entity {
	id: string | number;
	name: string;
	custom_name?: string;
	order: number;
	type: EntityType;
}

export enum EntityTypes {
	ACTIONS = 'actions',
	EVENTS = 'events',
}

export enum CompareLabelType {
	Current = 'current',
	Previous = 'previous',
}

export type EntityFilter = {
	type?: EntityType;
	id: Entity['id'] | null;
	name?: string | null;
	custom_name?: string | null;
	index?: number;
	order?: number;
};

export interface ActionFilter extends EntityFilter {
	math?: string;
	math_property?: string;
	math_group_type_index?: number | null;
	math_hogql?: string;
	properties?: AnyPropertyFilter[];
	type: EntityType;
}

export interface EventPropertyFilter extends BasePropertyFilter {
	type: PropertyFilterType.Event;
	operator: PropertyOperator;
}
export interface PersonPropertyFilter extends BasePropertyFilter {
	type: PropertyFilterType.Person;
	operator: PropertyOperator;
}
export interface ElementPropertyFilter extends BasePropertyFilter {
	type: PropertyFilterType.Element;
	key: 'tag_name' | 'text' | 'href' | 'selector';
	operator: PropertyOperator;
}
export interface SessionPropertyFilter extends BasePropertyFilter {
	type: PropertyFilterType.Session;
	key: '$session_duration';
	operator: PropertyOperator;
}

export interface CohortPropertyFilter extends BasePropertyFilter {
	type: PropertyFilterType.Cohort;
	key: 'id';
	value: number;
}

export interface GroupPropertyFilter extends BasePropertyFilter {
	type: PropertyFilterType.Group;
	group_type_index?: number | null;
	operator: PropertyOperator;
}

export interface FeaturePropertyFilter extends BasePropertyFilter {
	type: PropertyFilterType.Feature;
	operator: PropertyOperator;
}

export interface HogQLPropertyFilter extends BasePropertyFilter {
	type: PropertyFilterType.HogQL;
	key: string;
}

export interface EmptyPropertyFilter {
	type?: undefined;
	value?: undefined;
	operator?: undefined;
	key?: undefined;
}
export type AnyPropertyFilter =
	| EventPropertyFilter
	| PersonPropertyFilter
	| ElementPropertyFilter
	| SessionPropertyFilter
	| CohortPropertyFilter
	| RecordingDurationFilter
	| GroupPropertyFilter
	| FeaturePropertyFilter
	| HogQLPropertyFilter
	| EmptyPropertyFilter;

export interface TrendResult {
	action: ActionFilter;
	actions?: ActionFilter[];
	count: number;
	data: number[];
	days: string[];
	dates?: string[];
	label: string;
	labels: string[];
	breakdown_value?: string | number;
	aggregated_value: number;
	status?: string;
	compare_label?: CompareLabelType;
	compare?: boolean;
	persons_urls?: { url: string }[];
	persons?: Person;
	filter?: TrendsFilterType;
}

export interface TrendAPIResponse<ResultType = TrendResult[]> {
	type: 'Trends';
	is_cached: boolean;
	last_refresh: string | null;
	result: ResultType;
	timezone: string;
	next: string | null;
}
