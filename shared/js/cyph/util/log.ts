import * as msgpack from 'msgpack-lite';
import {env} from '../env';


const logs: {
	args: any[];
	argsCopy: string;
	error?: true;
	timestamp: number;
}[]	= [];

if (env.debug) {
	(<any> self).logs	= logs;
}


const debugLogInternal	= (error: boolean, ...args: any[]) : void => {
	if (!env.debug) {
		return;
	}

	let argsCopy: any|undefined;

	try {
		argsCopy	= msgpack.decode(msgpack.encode(args));
	}
	catch {}

	logs.push({
		args,
		argsCopy,
		/* tslint:disable-next-line:ban */
		timestamp: Date.now(),
		...(error ? {error} : {})
	});

	if (error) {
		/* tslint:disable-next-line:no-console */
		console.error(...args);
	}
	else {
		/* tslint:disable-next-line:no-console */
		console.log(...args);
	}
};


/** Logs to console in local env. */
export const debugLog	= (...args: any[]) : void => {
	debugLogInternal(false, args);
};

/** Logs error to console in local env. */
export const debugLogError	= (...args: any[]) : void => {
	debugLogInternal(true, args);
};
