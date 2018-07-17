import {env} from '../env';


const logs: {
	args: any[];
	error?: true;
	timestamp: number;
}[]	= [];

if (env.debug) {
	(<any> self).logs	= logs;
}


const copyByteArrays	= (x: any) : any => {
	if (x instanceof Uint8Array) {
		return {copy: new Uint8Array(x), original: x};
	}

	if (typeof x === 'object') {
		for (const k of Object.keys(x)) {
			x[k]	= copyByteArrays(x[k]);
		}
	}

	return x;
};

const logInternal	= (error: boolean, ...args: any[]) : void => {
	if (!env.debug) {
		return;
	}

	args	= copyByteArrays(args);

	/* tslint:disable-next-line:ban */
	logs.push({args, timestamp: Date.now(), ...(error ? {error} : {})});

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
export const log	= (...args: any[]) : void => {
	logInternal(false, args);
};

/** Logs error to console in local env. */
export const logError	= (...args: any[]) : void => {
	logInternal(true, args);
};
