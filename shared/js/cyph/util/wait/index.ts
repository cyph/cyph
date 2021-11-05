import {firstValueFrom, Observable} from 'rxjs';
import {Async} from '../../async-type';
import {config} from '../../config';
import {sleep} from './sleep';

export * from './resolvable';
export * from './retry-until-successful';
export * from './sleep';

/** Converts Async to awaitable Promise. */
export const awaitAsync = async <T>(value: Async<T>) : Promise<T> =>
	value instanceof Observable ? firstValueFrom(value) : value;

/** Sleeps forever. */
export const infiniteSleep = async () : Promise<void> => {
	while (true) {
		await sleep(config.maxInt32);
	}
};

/** Waits until value exists before resolving it in promise. */
export const waitForValue = async <T>(
	f: () => T | undefined,
	condition?: (value: T) => boolean
) : Promise<T> => {
	let value = f();
	while (value === undefined || (condition && !condition(value))) {
		await sleep();
		value = f();
	}
	return value;
};

/** Waits for iterable value to exist and have at least minLength elements. */
export const waitForIterable = async <T>(
	f: () => (T & {length: number}) | undefined,
	minLength: number = 1
) : Promise<T> => {
	return waitForValue<T & {length: number}>(
		f,
		value => value.length >= minLength
	);
};

/** Waits until function returns true. */
export const waitUntilTrue = async (f: () => boolean) : Promise<void> => {
	await waitForValue(() => f() || undefined);
};
