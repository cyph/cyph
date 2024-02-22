import type {Observable} from 'rxjs';

/**
 * Represents an asynchronous set value.
 * Currently just a subset of LocalAsyncSet's API, but can easily be expanded when needed.
 */
export interface IAsyncSet<T> {
	/** @see Set.add */
	addItem (value: T) : Promise<void>;

	/** @see Set.clear */
	clear () : Promise<void>;

	/** @see Set.delete */
	deleteItem (value: T) : Promise<void>;

	/** @see Set.has */
	hasItem (value: T) : Promise<boolean>;

	/** @see Set.size */
	size () : Promise<number>;

	/** Watches value. */
	watch () : Observable<Set<T>>;

	/** Watches size. */
	watchSize () : Observable<number>;
}
