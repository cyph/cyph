import {Observable, Subscription} from 'rxjs';


/**
 * Represents an asynchronous list/array value.
 */
export interface IAsyncList<T> {
	/** Gets value. */
	getValue () : Promise<T[]>;

	/** Executes a Promise within a mutual-exclusion lock in FIFO order. */
	lock<L> (f: (reason?: string) => Promise<L>, reason?: string) : Promise<L>;

	/** Pushes value to list. */
	pushValue (value: T) : Promise<void>;

	/** Sets value. */
	setValue (value: T[]) : Promise<void>;

	/** Subscribes to pushed values and deletes them. */
	subscribeAndPop (f: (value: T) => void|Promise<void>) : Subscription;

	/** Uses a function to transform value. Throwing aborts modification. */
	updateValue (f: (value: T[]) => Promise<T[]>) : Promise<void>;

	/** Subscribes to value. */
	watch () : Observable<T[]>;

	/** Subscribes to pushed values. */
	watchPushes () : Observable<T>;
}
