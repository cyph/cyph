import {env} from '../env';
import {random} from './random';
import {request} from './request';


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
export const getTimeString	= (timestamp: number) : string => {
	const date: Date		= new Date(timestamp);
	const minute: string	= ('0' + date.getMinutes().toString()).slice(-2);
	let hour: number		= date.getHours();
	let ampm				= 'am';

	if (hour >= 12) {
		hour	-= 12;
		ampm	= 'pm';
	}
	if (hour === 0) {
		hour	= 12;
	}

	return `${hour.toString()}:${minute}${ampm}`;
};
