import {BehaviorSubject, Observable} from 'rxjs';


/**
 * Represents an asynchronous value.
 */
export interface IAsyncValue<T> {
	/** Gets value. */
	getValue () : Promise<T>;

	/** Executes a Promise within a mutual-exclusion lock in FIFO order. */
	lock<L> (
		f: (o: {reason?: string; stillOwner: BehaviorSubject<boolean>}) => Promise<L>,
		reason?: string
	) : Promise<L>;

	/** Sets value. */
	setValue (value: T) : Promise<void>;

	/** Uses a function to transform value. Throwing aborts modification. */
	updateValue (f: (value: T) => Promise<T>) : Promise<void>;

	/** Subscribes to value. */
	watch () : Observable<T>;
}
