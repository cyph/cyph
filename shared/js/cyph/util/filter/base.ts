import {MaybePromise} from '../../maybe-promise-type';

/** Filters asynchronously. */
export const filterAsync = async <T>(
	arr: T[],
	f: (value: T) => MaybePromise<boolean>
) : Promise<T[]> =>
	(await Promise.all(
		arr.map(async value => ({filter: await f(value), value}))
	))
		.filter(o => o.filter)
		.map(o => o.value);

/** Filters out undefined values. */
/* eslint-disable-next-line @typescript-eslint/tslint/config */
export const filterUndefined = <T>(arr: (T | undefined | void)[]) : T[] =>
	<T[]> arr.filter(t => t !== undefined);
