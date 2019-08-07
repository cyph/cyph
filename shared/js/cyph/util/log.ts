import * as msgpack from 'msgpack-lite';
import {env} from '../env';
import {MaybePromise} from '../maybe-promise-type';
import {prettyPrint} from './serialization/json';

const logs: {
	args: any[];
	argsCopy: string;
	error?: true;
	timeDifference: number;
	timestamp: number;
}[] = [];

if (env.debugLog) {
	(<any> self).logs = logs;
}

const debugLogInternal = async (
	error: boolean,
	argFunctions: (() => MaybePromise<any>)[]
): Promise<
	| undefined
	| {
			args: any[];
			argsCopy: string;
			error?: true;
			timeDifference: number;
			timestamp: number;
	  }
> => {
	if (!env.debugLog) {
		return;
	}

	const args = await Promise.all(argFunctions.map(async f => f()));

	let argsCopy: any | undefined;
	let argsString: string | undefined;

	try {
		argsCopy = msgpack.decode(msgpack.encode(args));
		argsString =
			argsCopy.length > 1 ?
				prettyPrint(argsCopy) :
			typeof argsCopy[0] === 'string' ?
				argsCopy[0] :
				prettyPrint(argsCopy[0]);
	}
	catch {}

	/* tslint:disable-next-line:ban */
	const timestamp = Date.now();

	const log = {
		args,
		argsCopy,
		timeDifference:
			logs.length > 0 ? timestamp - logs.slice(-1)[0].timestamp : 0,
		timestamp,
		...(error ? {error} : {})
	};

	logs.push(log);

	if (error) {
		/* tslint:disable-next-line:no-console */
		console.error(...(argsString ? [argsString] : args));
	}
	else {
		/* tslint:disable-next-line:no-console */
		console.log(...(argsString ? [argsString] : args));
	}

	return log;
};

/** Logs to console in local env. */
export const debugLog = async (
	...args: (() => MaybePromise<any>)[]
): Promise<void> => {
	await debugLogInternal(false, args);
};

/** Logs error to console in local env. */
export const debugLogError = async (
	...args: (() => MaybePromise<any>)[]
): Promise<void> => {
	await debugLogInternal(true, args);
};

/** Logs time difference to console in local env. */
export const debugLogTime = async (
	...args: (() => MaybePromise<any>)[]
): Promise<void> => {
	const o = await debugLogInternal(false, args);
	if (o) {
		/* tslint:disable-next-line:no-console */
		console.log(o.timeDifference);
	}
};
