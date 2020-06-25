import {IResolvable} from '../../iresolvable';

/** Returns a promise and its resolver function. */
/* eslint-disable-next-line @typescript-eslint/tslint/config, @typescript-eslint/promise-function-async */
export const resolvable = <T = void>(value?: T) : IResolvable<T> => {
	let resolve: ((t?: T | PromiseLike<T>) => void) | undefined;
	let reject: ((err?: any) => void) | undefined;

	/* eslint-disable-next-line @typescript-eslint/tslint/config */
	const promise = new Promise<T>((promiseResolve, promiseReject) => {
		resolve =
			value === undefined ?
				promiseResolve :
				() => {
					promiseResolve(value);
				};
		reject = promiseReject;
	});

	if (!resolve || !reject) {
		throw new Error('Promise constructor did not run.');
	}

	const o: IResolvable<T> = Object.create(promise, {
		complete: {
			value: false,
			writable: true
		},
		promise: {
			value: promise,
			writable: false
		},
		reject: {
			value: reject,
			writable: false
		},
		rejected: {
			value: false,
			writable: true
		},
		resolve: {
			value: resolve,
			writable: false
		},
		resolved: {
			value: false,
			writable: true
		},
		value: {
			value: undefined,
			writable: true
		}
	});

	promise
		.then(finalValue => {
			o.complete = true;
			o.resolved = true;
			o.value = finalValue;
		})
		.catch(() => {
			o.complete = true;
			o.rejected = true;
		});

	return o;
};

/** Returns an already resolved resolvable. */
/* eslint-disable-next-line @typescript-eslint/tslint/config, @typescript-eslint/promise-function-async */
export const resolvedResolvable = <T = void>(value?: T) : IResolvable<T> => {
	const o = resolvable<T>(value);
	o.resolve();
	return o;
};
