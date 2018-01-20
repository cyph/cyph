import memoize from 'lodash-es/memoize';
import {env} from '../env';
import {ITime} from '../itime';
import {ITimeRange} from '../itime-range';
import {random} from './random';
import {request} from './request';
import {translate} from './translate';


/** @ignore */
const stringFormats	= {
	date: {day: 'numeric', hour: 'numeric', minute: 'numeric', month: 'short', year: 'numeric'},
	time: {hour: 'numeric', minute: 'numeric'}
};

/** @ignore */
const timestampData	= {
	last: 0,
	offset: (async () => {
		/* tslint:disable-next-line:ban */
		const start		= Date.now();
		const server	= parseFloat(await request({url: env.baseUrl + 'timestamp'}));
		/* tslint:disable-next-line:ban */
		const end		= Date.now();

		if (server > start && server < end) {
			return 0;
		}
		else {
			return server - end;
		}
	})().catch(
		() => 0
	),
	subtime: 0
};

/** @ignore */
const getTimesInternal	= (
	timeRange: ITimeRange,
	increment: number,
	startPadding: number,
	endPadding: number
) : ITime[] => {
	const times: ITime[]	= [];
	const endTime			= timeRange.end.hour * 60 + timeRange.end.minute + endPadding;

	for (
		let {hour, minute}	= {
			hour: timeRange.start.hour,
			minute: timeRange.start.minute + startPadding
		};
		(hour * 60 + minute) <= endTime;
		minute += increment
	) {
		while (minute >= 60) {
			minute -= 60;
			++hour;
		}

		if (hour >= 24) {
			break;
		}

		times.push({hour, minute});
	}

	return times;
};

/** @ignore */
const getTimesInternalWrapper	=
	memoize((endHour: number) =>
		memoize((endMinute: number) =>
			memoize((startHour: number) =>
				memoize((startMinute: number) =>
					memoize((increment: number) =>
						memoize((startPadding: number) =>
							memoize((endPadding: number) =>
								getTimesInternal(
									{
										end: {hour: endHour, minute: endMinute},
										start: {hour: startHour, minute: startMinute}
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
	)
;

/** @ignore */
const getTimeStringInternal	= (timestamp: number|Date, includeDate: boolean) : string =>
	(typeof timestamp === 'number' ? new Date(timestamp) : timestamp).toLocaleString(
		undefined,
		includeDate ? stringFormats.date : stringFormats.time
	).replace(
		' AM',
		'am'
	).replace(
		' PM',
		'pm'
	)
;

/** Converts a timestamp into a Date. */
export const timestampToDate	= memoize((timestamp?: number) : Date =>
	timestamp === undefined || isNaN(timestamp) ? new Date() : new Date(timestamp)
);

/** Returns a human-readable representation of the date and time (e.g. "Jan 1, 2018, 3:37pm"). */
export const getDateTimeString	= memoize((timestamp: number) : string =>
	getTimeStringInternal(timestamp, true)
);

/**
 * Returns a human-readable representation of an amount of time (e.g. "1 Hour").
 * @param time Number of milliseconds.
 */
export const getDurationString	= memoize((time: number) : string =>
	time < 3600000 ?
		`${time / 60000} ${translate('Minutes')}` :
		`${(time / 3600000).toFixed(1).replace('.0', '')} ${translate('Hours')}`
);

/**
 * Converts a time range into a list of times.
 * @param increment Number of minutes between times in list.
 * @param startPadding Skips this number of minutes at the start.
 * @param endPadding Stops this number of minutes before the end.
 */
export const getTimes	= (
	timeRange: ITimeRange,
	increment: number = 30,
	startPadding: number = 0,
	endPadding: number = 0
) : ITime[] =>
	getTimesInternalWrapper(
		timeRange.end.hour
	)(
		timeRange.end.minute
	)(
		timeRange.start.hour
	)(
		timeRange.start.minute
	)(
		increment
	)(
		startPadding
	)(
		endPadding
	)
;

/**
 * Returns current timestamp, with logic to correct for incorrect
 * local clocks and ensure each output is unique.
 */
export const getTimestamp	= async () : Promise<number> => {
	/* tslint:disable-next-line:ban */
	let unixMilliseconds: number	= Date.now() + (await timestampData.offset);

	if (unixMilliseconds === timestampData.last) {
		timestampData.subtime += random() / 100;
		unixMilliseconds += timestampData.subtime;
	}
	else {
		timestampData.last		= unixMilliseconds;
		timestampData.subtime	= 0;
	}

	return unixMilliseconds;
};

/** Returns a human-readable representation of the time (e.g. "3:37pm"). */
export const getTimeString	= memoize((timestamp: number|ITime) : string => {
	if (typeof timestamp === 'number') {
		return getTimeStringInternal(timestamp, false);
	}

	const date	= new Date();
	date.setHours(timestamp.hour);
	date.setMinutes(timestamp.minute);
	return getTimeStringInternal(date, false);
});

/** Converts a timestamp into a 24-hour time. */
/* tslint:disable-next-line:cyclomatic-complexity */
export const timestampTo24HourTimeString	= memoize((
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
	else if (maxHours === undefined && maxMinutes !== undefined) {
		throw new Error('Cannot use maxMinutes without maxHours.');
	}
	else if (minHours !== undefined && (isNaN(minHours) || minHours < 0 || minHours > 23)) {
		throw new Error('Invalid minHours.');
	}
	else if (
		minMinutes !== undefined && (isNaN(minMinutes) || minMinutes < 0 || minMinutes > 59)
	) {
		throw new Error('Invalid minMinutes.');
	}
	else if (maxHours !== undefined && (isNaN(maxHours) || maxHours < 0 || maxHours > 23)) {
		throw new Error('Invalid maxHours.');
	}
	else if (
		maxMinutes !== undefined && (isNaN(maxMinutes) || maxMinutes < 0 || maxMinutes > 59)
	) {
		throw new Error('Invalid maxMinutes.');
	}
	else if (
		((minHours || 0) * 3600 + (minMinutes || 0) * 60) >
		((maxHours || 0) * 3600 + (maxMinutes || 0) * 60)
	) {
		throw new Error('Lower bound cannot exceed upper bound.');
	}
	else if (roundToHalfHour && (
		(minMinutes !== undefined && minMinutes !== 0 && minMinutes !== 30) ||
		(maxMinutes !== undefined && maxMinutes !== 0 && maxMinutes !== 30)
	)) {
		throw new Error('minMinutes and maxMinutes must conform to roundToHalfHour.');
	}

	const date	= timestampToDate(timestamp);
	let hours	= date.getHours();
	let minutes	= date.getMinutes();

	if (roundToHalfHour) {
		if (minutes < 15) {
			minutes	= 0;
		}
		else if (minutes >= 45 && hours < 23) {
			minutes	= 0;
			++hours;
		}
		else {
			minutes	= 30;
		}
	}

	if (minHours !== undefined && hours <= minHours) {
		hours	= minHours;
		if (minMinutes !== undefined && minutes < minMinutes) {
			minutes	= minMinutes;
		}
	}

	if (maxHours !== undefined && hours >= maxHours) {
		hours	= maxHours;
		if (maxMinutes !== undefined && minutes > maxMinutes) {
			minutes	= maxMinutes;
		}
	}

	return `${`0${hours.toString()}`.slice(-2)}:${`0${minutes.toString()}`.slice(-2)}`;
});

/** Converts a timestamp into an ITime. */
export const timestampToTime	= memoize((timestamp?: number) : ITime => {
	const date	= timestampToDate(timestamp);

	return {
		hour: date.getHours(),
		minute: date.getMinutes()
	};
});

/**
 * Changes the date and/or time of a timestamp.
 * @param time 24-hour time or ITime.
 */
export const timestampUpdate	= memoize(
	(timestamp: number, date?: Date, time?: string|ITime) : number => {
		const timestampDate		= timestampToDate(timestamp);

		if (date !== undefined) {
			timestampDate.setDate(date.getDate());
			timestampDate.setMonth(date.getMonth());
			timestampDate.setFullYear(date.getFullYear());
		}

		if (time !== undefined) {
			const [hours, minutes]	= typeof time === 'string' ?
				time.split(':').map(s => parseInt(s, 10)) :
				[time.hour, time.minute]
			;

			timestampDate.setHours(hours || 0);
			timestampDate.setMinutes(minutes || 0);
		}

		return timestampDate.getTime();
	},
	(timestamp: number, date?: Date, time?: string|ITime) =>
		`${timestamp.toString()}\n` +
		`${date === undefined ? '' : date.getTime().toString()}\n` +
		(
			time === undefined ? '' : typeof time === 'string' ? time : `${
				('0' + time.hour.toString()).slice(-2)
			}:${
				('0' + time.minute.toString()).slice(-2)
			}`
		)
);

/** @see getTimestamp */
export const getDate	= async () => timestampToDate(await getTimestamp());
