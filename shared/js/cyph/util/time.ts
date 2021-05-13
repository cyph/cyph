/* eslint-disable max-lines */

import memoize from 'lodash-es/memoize';
import {concat, interval, of, timer} from 'rxjs';
import {map, switchMap} from 'rxjs/operators';
import {env} from '../env';
import {ITimeRange} from '../itime-range';
import {Time} from '../time-type';
import {flattenObservable} from './flatten-observable';
import {toInt} from './formatting';
import {lockFunction} from './lock';
import {request} from './request';
import {translate} from './translate';
import {sleep} from './wait';

/** @ignore */
const stringFormats = {
	date: {
		day: <'numeric'> 'numeric',
		hour: <'numeric'> 'numeric',
		minute: <'numeric'> 'numeric',
		month: <'short'> 'short',
		year: <'numeric'> 'numeric'
	},
	time: {hour: <'numeric'> 'numeric', minute: <'numeric'> 'numeric'}
};

/** @ignore */
const strings = {
	dayAgo: translate('day ago'),
	daysAgo: translate('days ago'),
	hourAgo: translate('hour ago'),
	hoursAgo: translate('hours ago'),
	justNow: translate('Just now'),
	minuteAgo: translate('minute ago'),
	minutesAgo: translate('minutes ago'),
	monthAgo: translate('month ago'),
	monthsAgo: translate('months ago'),
	today: translate('Today'),
	yearAgo: translate('year ago'),
	yearsAgo: translate('years ago'),
	yesterday: translate('Yesterday')
};

/** @ignore */
const timestampData = {
	last: 0,
	offset: sleep(0)
		.then(async () => {
			/* eslint-disable-next-line @typescript-eslint/tslint/config */
			const start = Date.now();
			const server = parseFloat(
				await request({
					retries: 1,
					timeout: 1000,
					url: env.baseUrl + 'timestamp?' + start.toString()
				})
			);
			/* eslint-disable-next-line @typescript-eslint/tslint/config */
			const end = Date.now();

			if (server > start && server < end) {
				return 0;
			}

			return server - end;
		})
		.catch(() => 0)
};

/**
 * Fork of https://stackoverflow.com/a/44418732/459881
 * TODO: translations?
 */
const getOrdinal = memoize((n: number) : string => {
	const nAbs = Math.abs(n);

	return (
		n.toString() +
		(nAbs > 0 ?
			['th', 'st', 'nd', 'rd'][
				(nAbs > 3 && nAbs < 21) || nAbs % 10 > 3 ? 0 : nAbs % 10
			] :
			'th')
	);
});

/** Gets hour and minute of a Time or string of the form "hh:mm". */
export const getHourAndMinuteOfTime = (
	time: Time | string
) : {hour: number; minute: number} => {
	if (typeof time === 'string') {
		const [hour, minute] = time.split(':').map(toInt);
		return {hour, minute};
	}

	return {hour: Math.floor(time / 60), minute: time % 60};
};

/** Converts hour and minute into Time. */
export const hourAndMinuteToTime = (o: {hour: number; minute: number}) : Time =>
	o.hour * 60 + o.minute;

/** @ignore */
const getTimesInternal = (
	timeRange: ITimeRange,
	increment: number,
	startPadding: number,
	endPadding: number
) : Time[] => {
	if (
		timeRange.start.hour === 0 &&
		timeRange.start.minute === 0 &&
		timeRange.end.hour === 24 &&
		timeRange.end.minute === 0
	) {
		startPadding = 0;
		endPadding = 0;
	}
	else {
		startPadding = Math.ceil(startPadding / increment) * increment;
		endPadding = Math.ceil(endPadding / increment) * increment;
	}

	const times: Time[] = [];
	const endTime = hourAndMinuteToTime(timeRange.end) - endPadding;

	for (
		let {hour, minute} = {
			hour: timeRange.start.hour,
			minute: timeRange.start.minute + startPadding
		};
		hour * 60 + minute <= endTime;
		minute += increment
	) {
		while (minute >= 60) {
			minute -= 60;
			++hour;
		}

		if (hour >= 24) {
			break;
		}

		times.push(hourAndMinuteToTime({hour, minute}));
	}

	return times;
};

/** @ignore */
const getTimesInternalWrapper = memoize((endHour: number) =>
	memoize((endMinute: number) =>
		memoize((startHour: number) =>
			memoize((startMinute: number) =>
				memoize((increment: number) =>
					memoize((startPadding: number) =>
						memoize((endPadding: number) =>
							getTimesInternal(
								{
									end: {hour: endHour, minute: endMinute},
									start: {
										hour: startHour,
										minute: startMinute
									}
								},
								increment,
								startPadding,
								endPadding
							)
						)
					)
				)
			)
		)
	)
);

/** @ignore */
const timestampToDateInternal = memoize((noZero: boolean) =>
	memoize(
		(timestamp?: number) : Date =>
			timestamp === undefined ||
			isNaN(timestamp) ||
			(noZero && timestamp === 0) ?
				new Date() :
				new Date(timestamp)
	)
);

/** Converts a timestamp into a Date. */
export const timestampToDate = (
	timestamp?: number | Date,
	noZero: boolean = false
) : Date =>
	timestamp instanceof Date ?
		timestamp :
		timestampToDateInternal(noZero)(timestamp);

/** Converts a timestamp into a Date and zeroes out seconds and milliseconds. */
export const timestampToDateNoSeconds = memoize(
	(timestamp: number) : Date =>
		new Date(new Date(new Date(timestamp).setSeconds(0)).setMilliseconds(0))
);

/** @ignore */
const getTimeStringInternal = (
	timestamp: number | Date,
	includeDate: boolean,
	includeSecond: boolean
) : string =>
	timestampToDate(timestamp)
		.toLocaleString(undefined, {
			...(includeDate ? stringFormats.date : stringFormats.time),
			...(includeSecond ? {second: 'numeric'} : {})
		})
		.replace(' AM', 'am')
		.replace(' PM', 'pm');

/** @ignore */
const compareDatesInternal = memoize((a: Date | number) =>
	memoize((b: Date | number) =>
		memoize((local: boolean) : boolean => {
			if (typeof a === 'number') {
				if (isNaN(a)) {
					return false;
				}

				a = timestampToDate(a);
			}
			if (typeof b === 'number') {
				if (isNaN(b)) {
					return false;
				}

				b = timestampToDate(b);
			}

			return local ?
				a.getFullYear() === b.getFullYear() &&
					a.getMonth() === b.getMonth() &&
					a.getDate() === b.getDate() :
				a.getUTCFullYear() === b.getUTCFullYear() &&
					a.getUTCMonth() === b.getUTCMonth() &&
					a.getUTCDate() === b.getUTCDate();
		})
	)
);

/** Returns true if both Dates/timestamps represent the same year, month, and day. */
export const compareDates = (
	a: Date | number,
	b: Date | number,
	local: boolean = false
) : boolean => compareDatesInternal(a)(b)(local);

/** @ignore */
const getStartPaddingInternal = memoize((timeRange: ITimeRange) =>
	memoize((now?: Date | number) =>
		memoize((startTime?: Date | number) : number => {
			if (
				(typeof now !== 'number' && !(now instanceof Date)) ||
				(typeof startTime !== 'number' &&
					!(startTime instanceof Date)) ||
				!compareDates(now, startTime, true)
			) {
				return 0;
			}

			if (typeof now === 'number') {
				now = timestampToDate(now);
			}

			return (
				now.getMinutes() +
				now.getHours() * 60 -
				(timeRange.start.minute + timeRange.start.hour * 60)
			);
		})
	)
);

/** Calculates start time padding (minutes) to disallow times on this day before right now. */
export const getStartPadding = (
	timeRange: ITimeRange,
	now?: Date | number,
	startTime?: Date | number
) : number => getStartPaddingInternal(timeRange)(now)(startTime);

/** Returns a human-readable representation of the date (e.g. "January 1st, 2018"). */
export const getDateString = memoize((timestamp?: number | Date) : string => {
	const date = timestampToDate(timestamp);

	return `${date.toLocaleDateString(undefined, {
		month: 'long'
	})} ${getOrdinal(date.getDate())}, ${date.getFullYear()}`;
});

/** Returns a human-readable representation of the date and time (e.g. "Jan 1, 2018, 3:37pm"). */
export const getDateTimeString = memoize((timestamp: number) : string =>
	getTimeStringInternal(timestamp, true, false)
);

/**
 * Returns a human-readable representation of an amount of time (e.g. "1 Hour").
 * @param time Number of milliseconds.
 */
export const getDurationString = memoize((time: number) : string => {
	const {n, unit} =
		time < 3600000 ?
			{n: (time / 60000).toString(), unit: 'Minute'} :
			{n: (time / 3600000).toFixed(1).replace('.0', ''), unit: 'Hour'};

	return `${n} ${translate(`${unit}${n === '1' ? '' : 's'}`)}`;
});

/** Returns an ISO 8601 representation of the date (e.g. "2018-01-01"). */
export const getISODateString = memoize(
	(timestamp?: number | Date) : string =>
		timestampToDate(timestamp)
			.toISOString()
			.split('T')[0]
);

/**
 * Converts a time range into a list of times.
 * @param increment Number of minutes between times in list.
 * @param startPadding Skips this number of minutes at the start.
 * @param endPadding Stops this number of minutes before the end.
 */
export const getTimes = (
	timeRange: ITimeRange,
	increment: number = 30,
	startPadding: number = 0,
	endPadding: number = 0
) : Time[] =>
	getTimesInternalWrapper(timeRange.end.hour)(timeRange.end.minute)(
		timeRange.start.hour
	)(timeRange.start.minute)(increment)(startPadding)(endPadding);

const getTimestampLock = lockFunction();

/**
 * Returns current timestamp, with logic to correct for incorrect
 * local clocks and ensure each output is unique.
 */
export const getTimestamp = async (forceUnique: boolean = false) =>
	getTimestampLock(async () => {
		/* eslint-disable-next-line @typescript-eslint/tslint/config */
		let unixMilliseconds = Date.now() + (await timestampData.offset);

		if (unixMilliseconds === timestampData.last && forceUnique) {
			++unixMilliseconds;
		}

		timestampData.last = unixMilliseconds;

		return unixMilliseconds;
	});

/** Returns a human-readable representation of the time (e.g. "3:37pm"). */
export const getTimeString = (
	timestamp?: number,
	includeSecond: boolean = false
) : string =>
	getTimeStringInternal(
		timestamp === undefined ? new Date() : timestamp,
		false,
		includeSecond
	);

/** Converts a timestamp into a 24-hour time. */
export const timestampTo24HourTimeString = memoize(
	/* eslint-disable-next-line complexity */
	(
		timestamp?: number,
		roundToHalfHour: boolean = false,
		minHours?: number,
		minMinutes?: number,
		maxHours?: number,
		maxMinutes?: number
	) : string => {
		if (minHours === undefined && minMinutes !== undefined) {
			throw new Error('Cannot use minMinutes without minHours.');
		}
		if (maxHours === undefined && maxMinutes !== undefined) {
			throw new Error('Cannot use maxMinutes without maxHours.');
		}
		if (
			minHours !== undefined &&
			(isNaN(minHours) || minHours < 0 || minHours > 23)
		) {
			throw new Error('Invalid minHours.');
		}
		if (
			minMinutes !== undefined &&
			(isNaN(minMinutes) || minMinutes < 0 || minMinutes > 59)
		) {
			throw new Error('Invalid minMinutes.');
		}
		if (
			maxHours !== undefined &&
			(isNaN(maxHours) || maxHours < 0 || maxHours > 23)
		) {
			throw new Error('Invalid maxHours.');
		}
		if (
			maxMinutes !== undefined &&
			(isNaN(maxMinutes) || maxMinutes < 0 || maxMinutes > 59)
		) {
			throw new Error('Invalid maxMinutes.');
		}
		if (
			(minHours || 0) * 3600 + (minMinutes || 0) * 60 >
			(maxHours || 0) * 3600 + (maxMinutes || 0) * 60
		) {
			throw new Error('Lower bound cannot exceed upper bound.');
		}
		if (
			roundToHalfHour &&
			((minMinutes !== undefined &&
				minMinutes !== 0 &&
				minMinutes !== 30) ||
				(maxMinutes !== undefined &&
					maxMinutes !== 0 &&
					maxMinutes !== 30))
		) {
			throw new Error(
				'minMinutes and maxMinutes must conform to roundToHalfHour.'
			);
		}

		const date = timestampToDate(timestamp);
		let hours = date.getHours();
		let minutes = date.getMinutes();

		if (roundToHalfHour) {
			if (minutes < 15) {
				minutes = 0;
			}
			else if (minutes >= 45 && hours < 23) {
				minutes = 0;
				++hours;
			}
			else {
				minutes = 30;
			}
		}

		if (minHours !== undefined && hours <= minHours) {
			hours = minHours;
			if (minMinutes !== undefined && minutes < minMinutes) {
				minutes = minMinutes;
			}
		}

		if (maxHours !== undefined && hours >= maxHours) {
			hours = maxHours;
			if (maxMinutes !== undefined && minutes > maxMinutes) {
				minutes = maxMinutes;
			}
		}

		return `${`0${hours.toString()}`.slice(
			-2
		)}:${`0${minutes.toString()}`.slice(-2)}`;
	}
);

/** Converts a timestamp into a Time. */
export const timestampToTime = memoize(
	(timestamp?: number) : Time => {
		const date = timestampToDate(timestamp);
		return hourAndMinuteToTime({
			hour: date.getHours(),
			minute: date.getMinutes()
		});
	}
);

/**
 * Changes the date and/or time of a timestamp.
 * @param time 24-hour time or ITime.
 */
export const timestampUpdate = memoize(
	(timestamp: number, date?: Date, time?: string | Time) : number => {
		const timestampDate = timestampToDate(timestamp);

		if (date !== undefined) {
			timestampDate.setDate(date.getDate());
			timestampDate.setMonth(date.getMonth());
			timestampDate.setFullYear(date.getFullYear());
		}

		if (time !== undefined) {
			const {hour, minute} = getHourAndMinuteOfTime(time);

			timestampDate.setHours(hour || 0);
			timestampDate.setMinutes(minute || 0);
		}

		return timestampDate.getTime();
	},
	(timestamp: number, date?: Date, time?: string | Time) => {
		let timeString: string;

		if (typeof time === 'string') {
			timeString = time;
		}
		else if (time === undefined) {
			timeString = '';
		}
		else {
			const {hour, minute} = getHourAndMinuteOfTime(time);

			timeString = `${('0' + hour.toString()).slice(-2)}:${(
				'0' + minute.toString()
			).slice(-2)}`;
		}

		return (
			`${timestamp.toString()}\n` +
			`${date === undefined ? '' : date.getTime().toString()}\n` +
			timeString
		);
	}
);

/** Returns a human-readable representation of a Time (e.g. "3:37pm"). */
export const timeToString = memoize((time: Time) => {
	const {hour, minute} = getHourAndMinuteOfTime(time);
	const date = new Date();

	date.setHours(hour);
	date.setMinutes(minute);

	return getTimeStringInternal(date, false, false);
});

/** Watches timestamp with the specified interval. */
export const watchTimestamp = memoize((msInterval: number = 1000) =>
	interval(msInterval).pipe(switchMap(async () => getTimestamp()))
);

/** @see getTimestamp */
export const getDate = async () => timestampToDate(await getTimestamp());

/** Gets timestamp of current date with time set to midnight local time. */
export const getMidnightTimestamp = async () : Promise<number> => {
	const date = await getDate();

	date.setHours(0);
	date.setMinutes(0);
	date.setSeconds(0);
	date.setMilliseconds(0);

	return date.getTime();
};

/** Watches for date changes. */
export const watchDateChange = memoize((emitImmediately: boolean = false) =>
	flattenObservable(async () => {
		const dateChanges = timer(
			86400000 -
				((await getTimestamp()) - (await getMidnightTimestamp())),
			86400000
		).pipe(map(() => {}));

		return !emitImmediately ?
			dateChanges :
			concat(of(undefined), dateChanges);
	})
);

/** @ignore */
const relativeDateStringInternal = memoize((now: number) =>
	memoize((date: number | Date) =>
		memoize((noToday: boolean) : string | undefined => {
			date = timestampToDate(date);

			return compareDates(date, now, true) ?
				noToday ?
					undefined :
					strings.today :
			compareDates(date, now - 86400000, true) ?
				strings.yesterday :
			date.getFullYear() === timestampToDate(now).getFullYear() ?
				`${date.toLocaleDateString(undefined, {
					weekday: 'long'
				})}, ${date.toLocaleDateString(undefined, {
					month: 'long'
				})} ${getOrdinal(date.getDate())}` :
				getDateString(date);
		})
	)
);

/**
 * Returns a human-readable representation of the date relative to today.
 * @example Today
 * @example Yesterday
 * @example Monday, June 18th
 * @example December 31, 2017
 */
export const relativeDateString = async (
	date: number | Date,
	noToday: boolean = false
) => relativeDateStringInternal(await getMidnightTimestamp())(date)(noToday);

/** @see relativeDateString */
export const watchRelativeDateString = memoize(
	(date: number | Date, noToday?: boolean) =>
		watchDateChange(true).pipe(
			switchMap(async () => relativeDateString(date, noToday))
		)
);

/** @ignore */
const relativeDateTimeStringInternal = memoize((now: number) =>
	memoize(
		async (date: number | Date) : Promise<string> => {
			if (date instanceof Date) {
				date = date.getTime();
			}

			const delta = now - date;

			if (delta < 60000) {
				return strings.justNow;
			}

			if (delta < 3600000) {
				const minutes = Math.floor((now - date) / 60000);
				return `${minutes.toString()} ${
					minutes === 1 ? strings.minuteAgo : strings.minutesAgo
				}`;
			}

			if (delta < 86400000) {
				const hours = Math.floor((now - date) / 3600000);
				return `${hours.toString()} ${
					hours === 1 ? strings.hourAgo : strings.hoursAgo
				}`;
			}

			if (delta < 2629800000) {
				const days = Math.floor((now - date) / 86400000);
				return `${days.toString()} ${
					days === 1 ? strings.dayAgo : strings.daysAgo
				}`;
			}

			if (delta < 31557600000) {
				const months = Math.floor((now - date) / 2629800000);
				return `${months.toString()} ${
					months === 1 ? strings.monthAgo : strings.monthsAgo
				}`;
			}

			const years = Math.floor((now - date) / 31557600000);
			return `${years.toString()} ${
				years === 1 ? strings.yearAgo : strings.yearsAgo
			}`;
		}
	)
);

/**
 * Returns a human-readable representation of the date and time relative to today.
 * @example Just now
 * @example 10 minutes ago
 * @example 1 hour ago
 * @example 2 days ago
 * @example 10 years ago
 */
export const relativeDateTimeString = async (date: number | Date) =>
	relativeDateTimeStringInternal(await getTimestamp())(date);

/** @see relativeDateTimeString */
export const watchRelativeDateTimeString = memoize((date: number | Date) =>
	timer(0, 60000).pipe(switchMap(async () => relativeDateTimeString(date)))
);
