import type {BehaviorSubject, Observable, Subscription} from 'rxjs';
import type {ITimedValue} from './itimed-value';
import type {MaybePromise} from './maybe-promise-type';

/**
 * Represents an asynchronous list/array value.
 */
export interface IAsyncList<T> {
	/** Deletes all values and resets this to an empty list. */
	clear () : Promise<void>;

	/** Gets flattened value. */
	getFlatValue () : Promise<T extends any[] ? T : T[]>;

	/** Gets value with timestamps. */
	getTimedValue () : Promise<ITimedValue<T>[]>;

	/** Gets value. */
	getValue () : Promise<T[]>;

	/** Executes a Promise within a mutual-exclusion lock in FIFO order. */
	lock<L> (
		f: (o: {
			reason?: string;
			stillOwner: BehaviorSubject<boolean>;
		}) => Promise<L>,
		reason?: string
	) : Promise<L>;

	/** Pushes value to list. */
	pushItem (value: T) : Promise<void>;

	/** Sets value. */
	setValue (value: T[]) : Promise<void>;

	/**
	 * Subscribes to pushed values and deletes them.
	 * @param f Subscribing function; throws exception to abort deletion.
	 */
	subscribeAndPop (f: (value: T) => MaybePromise<void>) : Subscription;

	/** Uses a function to transform value. Throwing aborts modification. */
	updateValue (f: (value: T[]) => Promise<T[]>) : Promise<void>;

	/** Subscribes to value. */
	watch () : Observable<T[]>;

	/** Subscribes to flattened value. */
	watchFlat (
		omitDuplicates?: boolean
	) : Observable<T extends any[] ? T : T[]>;

	/** Subscribes to pushed values. */
	watchPushes () : Observable<T>;
}
