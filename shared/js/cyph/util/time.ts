import memoize from 'lodash-es/memoize';
import {env} from '../env';
import {random} from './random';
import {request} from './request';


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
const getTimeStringInternal	= (timestamp: number, includeDate: boolean) : string =>
	new Date(timestamp).toLocaleString(
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

/** Returns a human-readable representation of the date and time (e.g. "Jan 1, 2018, 3:37pm"). */
export const getDateTimeString	= memoize((timestamp: number) : string =>
	getTimeStringInternal(timestamp, true)
);

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
export const getTimeString	= memoize((timestamp: number) : string =>
	getTimeStringInternal(timestamp, false)
);

/** Converts a timestamp into a Date. */
export const timestampToDate	= memoize((timestamp?: number) : Date =>
	timestamp === undefined || isNaN(timestamp) ? new Date() : new Date(timestamp)
);

/** Converts a timestamp into a 24-hour time. */
export const timestampToTime	= memoize((
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

/** Changes the Date and/or time of a timestamp. */
export const timestampUpdate	=
	memoize((timestamp: number, date?: Date, time?: string) : number => {
		const timestampDate		= timestampToDate(timestamp);

		if (date !== undefined) {
			timestampDate.setDate(date.getDate());
			timestampDate.setMonth(date.getMonth());
			timestampDate.setFullYear(date.getFullYear());
		}

		if (time !== undefined) {
			const [hours, minutes]	= time.split(':').map(s => parseInt(s, 10));

			timestampDate.setHours(hours || 0);
			timestampDate.setMinutes(minutes || 0);
		}

		return timestampDate.getTime();
	})
;

/** @see getTimestamp */
export const getDate	= async () => timestampToDate(await getTimestamp());
