import {Observable} from 'rxjs';
import {LockFunction} from '../lock-function-type';
import {MaybePromise} from '../maybe-promise-type';
import {cacheObservable} from './flatten-observable';
import {lockFunction} from './lock';


/** @ignore */
const getOrSetDefaultAsyncLocks: Map<any, LockFunction>	=
	new Map<any, LockFunction>()
;

/** Gets a value from a map and sets a default value if none had previously been set. */
export const getOrSetDefault	= <K, V> (
	map: Map<K, V>|undefined,
	key: K|undefined,
	defaultValue: () => V
) : V => {
	if (map === undefined || key === undefined) {
		return defaultValue();
	}

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
	map: MaybePromise<Map<K, V>|undefined>,
	key: MaybePromise<K|undefined>,
	defaultValue: () => MaybePromise<V>
) : Promise<V> => {
	const k	= await key;
	const m	= await map;

	if (m === undefined || k === undefined) {
		return defaultValue();
	}

	if (!m.has(k)) {
		await getOrSetDefault(
			getOrSetDefaultAsyncLocks,
			k,
			lockFunction
		)(async () => {
			if (!m.has(k)) {
				m.set(k, await defaultValue());
			}
		});
	}

	const value	= m.get(k);

	if (value === undefined) {
		throw new Error("util/getOrSetDefaultAsync doesn't support nullable types.");
	}

	return value;
};

/** Observable variant of getOrSetDefault. */
export const getOrSetDefaultObservable	= <K, V> (
	map: MaybePromise<Map<K, Observable<V>>>,
	key: MaybePromise<K>,
	defaultValue: () => MaybePromise<Observable<V>>
) : Observable<V> => cacheObservable(
	getOrSetDefaultAsync(map, key, defaultValue)
);
