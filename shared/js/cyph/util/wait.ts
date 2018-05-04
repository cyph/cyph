import {Observable} from 'rxjs';
import {take} from 'rxjs/operators';
import {Async} from '../async-type';
import {config} from '../config';
import {IResolvable} from '../iresolvable';
import {MaybePromise} from '../maybe-promise-type';


/** Converts Async to awaitable Promise. */
export const awaitAsync	= async <T> (value: Async<T>) : Promise<T> => {
	if (value instanceof Observable) {
		return value.pipe(take(1)).toPromise();
	}

	return value;
};

/** Returns a promise and its resolver function. */
export const resolvable	= <T = void> (value?: T) : IResolvable<T> => {
	let resolve: ((t?: T|PromiseLike<T>) => void)|undefined;
	let reject: ((err?: any) => void)|undefined;

	/* tslint:disable-next-line:promise-must-complete */
	const promise	= new Promise<T>((promiseResolve, promiseReject) => {
		resolve	= value === undefined ? promiseResolve : () => { promiseResolve(value); };
		reject	= promiseReject;
	});

	if (!resolve || !reject) {
		throw new Error('Promise constructor did not run.');
	}

	return {promise, reject, resolve};
};

/** Sleep for the specifed amount of time. */
export const sleep	= async (ms: number = 250) : Promise<void> => {
	/* tslint:disable-next-line:ban */
	return new Promise<void>(resolve => { setTimeout(() => { resolve(); }, ms); });
};

/** Sleeps forever. */
export const infiniteSleep	= async () : Promise<void> => {
	while (true) {
		await sleep(config.maxInt32);
	}
};

/** Runs f until it returns with no errors. */
export const retryUntilSuccessful	= async <T> (
	f: () => (MaybePromise<T>),
	maxAttempts: number = 10
) : Promise<T> => {
	for (let i = 0 ; true ; ++i) {
		try {
			return await f();
		}
		catch (err) {
			if (i > maxAttempts) {
				throw err;
			}
			else {
				await sleep();
			}
		}
	}
};

/** Waits until value exists before resolving it in promise. */
export const waitForValue	= async <T> (
	f: () => T|undefined,
	condition?: (value: T) => boolean
) : Promise<T> => {
	let value: T|undefined	= f();
	while (value === undefined || (condition && !condition(value))) {
		await sleep();
		value	= f();
	}
	return value;
};

/** Waits for iterable value to exist and have at least minLength elements. */
export const waitForIterable	= async <T> (
	f: () => T&{length: number}|undefined,
	minLength: number = 1
) : Promise<T> => {
	return waitForValue<T&{length: number}>(f, value => value.length >= minLength);
};

/** Waits until function returns true. */
export const waitUntilTrue	= async (f: () => boolean) : Promise<void> => {
	await waitForValue(() => f() || undefined);
};
