import * as msgpack from 'msgpack-lite';
import {env} from '../env';
import {MaybePromise} from '../maybe-promise-type';
import {prettyPrint} from './serialization/json';


const logs: {
	args: any[];
	argsCopy: string;
	error?: true;
	timestamp: number;
}[]	= [];

if (env.debugLog) {
	(<any> self).logs	= logs;
}


const debugLogInternal	= async (
	error: boolean,
	argFunctions: (() => MaybePromise<any>)[]
) : Promise<void> => {
	if (!env.debugLog) {
		return;
	}

	const args	= await Promise.all(argFunctions.map(async f => f()));

	let argsCopy: any|undefined;
	let argsString: string|undefined;

	try {
		argsCopy	= msgpack.decode(msgpack.encode(args));
		argsString	=
			argsCopy.length > 1 ?
				prettyPrint(argsCopy) :
			typeof argsCopy[0] === 'string' ?
				argsCopy[0] :
				prettyPrint(argsCopy[0])
		;
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
		console.error(...(argsString ? [argsString] : args));
	}
	else {
		/* tslint:disable-next-line:no-console */
		console.log(...(argsString ? [argsString] : args));
	}
};


/** Logs to console in local env. */
export const debugLog	= async (...args: (() => MaybePromise<any>)[]) : Promise<void> =>
	debugLogInternal(false, args)
;

/** Logs error to console in local env. */
export const debugLogError	= async (...args: (() => MaybePromise<any>)[]) : Promise<void> =>
	debugLogInternal(true, args)
;
