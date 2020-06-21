import {IResolvable} from '../../iresolvable';

/** Returns a promise and its resolver function. */
/* eslint-disable-next-line @typescript-eslint/tslint/config */
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

	const o: IResolvable<T> = {promise, reject, resolve};

	promise
		.then(finalValue => {
			o.value = finalValue;
		})
		.catch(() => {});

	return o;
};

/** Returns an already resolved resolvable. */
export const resolvedResolvable = <T = void>(value?: T) : IResolvable<T> => {
	const o = resolvable<T>(value);
	o.resolve();
	return o;
};
