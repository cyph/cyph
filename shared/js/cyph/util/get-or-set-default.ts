import {Observable, Subscription} from 'rxjs';
import {IResolvable} from '../iresolvable';
import {LockFunction} from '../lock-function-type';
import {MaybePromise} from '../maybe-promise-type';
import {cacheObservable} from './flatten-observable';
import {lockFunction} from './lock';
import {resolvable} from './wait/resolvable';

/** @ignore */
const getOrSetDefaultAsyncData = new Map<
	Map<any, any>,
	Map<
		any,
		{
			setLock: LockFunction;
			setResolver: IResolvable<any>;
		}
	>
>();

/** Gets a value from a map and sets a default value if none had previously been set. */
export const getOrSetDefault = <K, V>(
	map: Map<K, V> | undefined,
	key: K | undefined,
	defaultValue: () => V
) : V => {
	if (map === undefined || key === undefined) {
		return defaultValue();
	}

	if (!map.has(key)) {
		map.set(key, defaultValue());
	}

	const value = map.get(key);

	if (value === undefined) {
		throw new Error("util/getOrSetDefault doesn't support nullable types.");
	}

	return value;
};

/** Async variant of getOrSetDefault. */
export const getOrSetDefaultAsync = async <K, V>(
	map: MaybePromise<Map<K, V> | undefined>,
	key: MaybePromise<K | undefined>,
	defaultValue: () => MaybePromise<V>,
	lock: boolean = true,
	waitUntilAlreadySet: boolean = false
) : Promise<V> => {
	const k = await key;
	const m = await map;

	if (m === undefined || k === undefined) {
		return defaultValue();
	}

	if (!m.has(k)) {
		const {
			setLock,
			setResolver
		}: {
			setLock: LockFunction;
			setResolver: IResolvable<V>;
		} = getOrSetDefault(
			getOrSetDefault(
				getOrSetDefaultAsyncData,
				m,
				() =>
					new Map<
						any,
						{
							setLock: LockFunction;
							setResolver: IResolvable<V>;
						}
					>()
			),
			k,
			() => ({
				setLock: lockFunction(),
				setResolver: resolvable<V>()
			})
		);

		const setValue = (v: V) => {
			m.set(k, v);
			setResolver.resolve(v);
		};

		if (waitUntilAlreadySet) {
			return setResolver;
		}
		if (lock) {
			await setLock(async () => {
				if (m.has(k)) {
					return;
				}

				const v = await Promise.race([
					Promise.resolve(defaultValue()),
					setResolver
				]);

				if (v !== undefined && !m.has(k)) {
					setValue(v);
				}
			}).catch(() => {});
		}
		else {
			setValue(await defaultValue());
		}
	}

	const value = m.get(k);

	if (value === undefined) {
		throw new Error(
			"util/getOrSetDefaultAsync doesn't support nullable types."
		);
	}

	return value;
};

/** Observable variant of getOrSetDefault. */
export const getOrSetDefaultObservable = <K, V>(
	map: MaybePromise<Map<K, Observable<V>>>,
	key: MaybePromise<K>,
	defaultValue: () => MaybePromise<Observable<V>>,
	subscriptions?: Subscription[]
) : Observable<V> =>
	cacheObservable<V>(
		getOrSetDefaultAsync(map, key, defaultValue),
		subscriptions
	);
