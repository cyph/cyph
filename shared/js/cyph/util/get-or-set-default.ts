import {Observable} from 'rxjs/Observable';
import {LockFunction} from '../lock-function-type';
import {MaybePromise} from '../maybe-promise-type';
import {cacheObservable} from './flatten-observable';
import {lockFunction} from './lock';


/** @ignore */
const getOrSetDefaultAsyncLocks: Map<any, LockFunction>	=
	new Map<any, LockFunction>()
;

/** Gets a value from a map and sets a default value if none had previously been set. */
export const getOrSetDefault	= <K, V> (map: Map<K, V>, key: K, defaultValue: () => V) : V => {
	if (!map.has(key)) {
		map.set(key, defaultValue());
	}

	const value	= map.get(key);

	if (value === undefined) {
		throw new Error("util/getOrSetDefault doesn't support nullable types.");
	}

	return value;
};

/** Async variant of getOrSetDefault. */
export const getOrSetDefaultAsync	= async <K, V> (
	map: MaybePromise<Map<K, V>>,
	key: MaybePromise<K>,
	defaultValue: () => MaybePromise<V>
) : Promise<V> => {
	return getOrSetDefault(
		getOrSetDefaultAsyncLocks,
		await key,
		lockFunction
	)(async () => {
		key	= await key;
		map	= await map;

		if (!map.has(key)) {
			map.set(key, await defaultValue());
		}

		const value	= map.get(key);

		if (value === undefined) {
			throw new Error("util/getOrSetDefaultAsync doesn't support nullable types.");
		}

		return value;
	});
};

/** Observable variant of getOrSetDefault. */
export const getOrSetDefaultObservable	= <K, V> (
	map: MaybePromise<Map<K, Observable<V>>>,
	key: MaybePromise<K>,
	defaultValue: () => MaybePromise<Observable<V>>,
	defaultObservableValue: V
) : Observable<V> => cacheObservable(
	getOrSetDefaultAsync(map, key, defaultValue),
	defaultObservableValue
);
