import type {BehaviorSubject, Observable} from 'rxjs';

/**
 * Represents an asynchronous map.
 */
export interface IAsyncMap<K, V> {
	/** Deletes all values and resets this to an empty map. */
	clear () : Promise<void>;

	/** Gets one value. */
	getItem (key: K) : Promise<V>;

	/** Gets all keys. */
	getKeys () : Promise<K[]>;

	/** Gets entire map. */
	getValue () : Promise<Map<K, V>>;

	/** Checks whether one value exists. */
	hasItem (key: K) : Promise<boolean>;

	/** Executes a Promise within a mutual-exclusion lock in FIFO order. */
	lock<L> (
		f: (o: {
			reason?: string;
			stillOwner: BehaviorSubject<boolean>;
		}) => Promise<L>,
		reason?: string
	) : Promise<L>;

	/** Deletes one value. */
	removeItem (key: K) : Promise<void>;

	/** Sets one value. */
	setItem (key: K, value: V) : Promise<void>;

	/** Deletes all values and sets a new set of values. */
	setValue (map: Map<K, V>) : Promise<void>;

	/** Gets number of values. */
	size () : Promise<number>;

	/** Uses a function to transform one value. Throwing aborts modification. */
	updateItem (
		key: K,
		f: (value?: V) => Promise<V | undefined>
	) : Promise<void>;

	/** Uses a function to transform entire map value. Throwing aborts modification. */
	updateValue (f: (map: Map<K, V>) => Promise<Map<K, V>>) : Promise<void>;

	/** Subscribes to entire map. */
	watch () : Observable<Map<K, V>>;

	/** Watches one value. */
	watchItem (key: K) : Observable<V | undefined>;

	/** Subscribes to map keys. */
	watchKeys () : Observable<K[]>;

	/** Subscribes to map size. */
	watchSize () : Observable<number>;
}
