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
		catch: {
			value: async <TResult>(
				onrejected?:
					| ((reason: any) => TResult | PromiseLike<TResult>)
					/* eslint-disable-next-line no-null/no-null */
					| null
					| undefined
			) => promise.catch(onrejected),
			writable: false
		},
		complete: {
			value: false,
			writable: true
		},
		finally: {
			value: async (onfinally?: (() => void) | null | undefined) =>
				promise.finally(onfinally),
			writable: false
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
		then: {
			value: async <TResult1, TResult2>(
				onfulfilled?:
					| ((value: T) => TResult1 | PromiseLike<TResult1>)
					/* eslint-disable-next-line no-null/no-null */
					| null
					| undefined,
				onrejected?:
					| ((reason: any) => TResult2 | PromiseLike<TResult2>)
					/* eslint-disable-next-line no-null/no-null */
					| null
					| undefined
			) => promise.then(onfulfilled, onrejected),
			writable: false
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
