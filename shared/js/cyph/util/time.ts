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
export const getTimeString	= (timestamp: number, includeDate: boolean = false) : string =>
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
