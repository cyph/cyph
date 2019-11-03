import {MaybePromise} from '../../maybe-promise-type';
import {debugLogError} from '../log';
import {sleep} from './sleep';

/** Rejects promise after the specified timeout. */
export const promiseTimeout = async <T>(
	promise: MaybePromise<T>,
	timeout: number | undefined
) =>
	typeof timeout === 'number' ?
		Promise.race([
			Promise.resolve(promise),
			sleep(timeout).then(async () =>
				Promise.reject(`Timeout of ${timeout} exceeded.`)
			)
		]) :
		promise;

/**
 * Runs f until it returns with no errors.
 * @param timeout Max run-time per attempt.
 */
export const retryUntilSuccessful = async <T>(
	f: (lastErr?: any) => MaybePromise<T>,
	maxAttempts: number = 10,
	delay: number = 250,
	timeout?: number
) : Promise<T> => {
	let lastErr: any | undefined;

	for (let i = 0; true; ++i) {
		try {
			return await promiseTimeout(f(lastErr), timeout);
		}
		catch (err) {
			const throwing = i > maxAttempts;
			lastErr = err;

			debugLogError(
				() =>
					`retryUntilSuccessful ${
						throwing ? 'throwing' : 'ignoring'
					} error`,
				() => err
			);

			if (throwing) {
				throw err;
			}

			await sleep(delay);
		}
	}
};
