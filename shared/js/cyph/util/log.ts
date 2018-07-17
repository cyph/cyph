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

const debugLogInternal	= (error: boolean, ...args: any[]) : void => {
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
export const debugLog	= (...args: any[]) : void => {
	debugLogInternal(false, args);
};

/** Logs error to console in local env. */
export const debugLogError	= (...args: any[]) : void => {
	debugLogInternal(true, args);
};
