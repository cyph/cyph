import {env} from '../env';
import {MaybePromise} from '../maybe-promise-type';
import {lockFunction} from './lock';
import {
	dynamicDeserialize,
	dynamicSerializeBytes,
	prettyPrint
} from './serialization';

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

const debugLogLocalStorageKey = 'debugLog';
const debugLogStorageEnabled =
	/* eslint-disable-next-line @typescript-eslint/tslint/config */
	localStorage.getItem('debugLogStorageEnabled') === 'true';

const debugLogTimeLock = lockFunction();

const debugLogInternal = async (
	error: boolean,
	argFunctions: (() => MaybePromise<any>)[]
) : Promise<
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
		argsCopy = dynamicDeserialize(dynamicSerializeBytes(args));
		argsString =
			argsCopy.length > 1 ?
				prettyPrint(argsCopy) :
			typeof argsCopy[0] === 'string' ?
				argsCopy[0] :
				prettyPrint(argsCopy[0]);
	}
	catch {}

	/* eslint-disable-next-line @typescript-eslint/tslint/config */
	const timestamp = Date.now();
	const date = new Date(timestamp);

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
		/* eslint-disable-next-line no-console */
		console.error(date, ...(argsString ? [argsString] : args));
	}
	else {
		/* eslint-disable-next-line no-console */
		console.log(date, ...(argsString ? [argsString] : args));
	}

	if (env.debugLogID) {
		let logString = `[Invalid Log] ${date.toString()}`;
		try {
			logString = JSON.stringify(log);
		}
		catch {
			try {
				logString = JSON.stringify(
					dynamicDeserialize(dynamicSerializeBytes(log))
				);
			}
			catch {}
		}

		logString = `[${env.debugLogID}] ${logString}`;

		if (debugLogStorageEnabled) {
			/* eslint-disable-next-line @typescript-eslint/tslint/config */
			localStorage.setItem(
				debugLogLocalStorageKey,
				`${(localStorage.getItem(debugLogLocalStorageKey) || '')
					.split('\n')
					.slice(-100)
					.join('\n')}${logString}\n\n`
			);
		}
	}

	return log;
};

/** Logs to console in local env. */
export const debugLog = async (
	...args: (() => MaybePromise<any>)[]
) : Promise<void> => {
	await debugLogInternal(false, args);
};

/** Logs error to console in local env. */
export const debugLogError = async (
	...args: (() => MaybePromise<any>)[]
) : Promise<void> => {
	await debugLogInternal(true, args);
};

/** Logs time difference to console in local env. */
export const debugLogTime = async (
	...args: (() => MaybePromise<any>)[]
) : Promise<void> =>
	debugLogTimeLock(async () => {
		const o = await debugLogInternal(false, args);
		if (o) {
			/* eslint-disable-next-line no-console */
			console.log(o.timeDifference);
		}
	});
