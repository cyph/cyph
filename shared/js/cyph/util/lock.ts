import {BehaviorSubject} from 'rxjs';
import {LockFunction} from '../lock-function-type';


/** Executes a Promise within a mutual-exclusion lock in FIFO order. */
export const lock	= async <T> (
	mutex: {isOwned?: boolean; promise?: Promise<string|undefined>},
	f: (o: {reason?: string; stillOwner: BehaviorSubject<boolean>}) => Promise<T>,
	reason?: string
) : Promise<T> => {
	if (!mutex.promise) {
		mutex.promise	= Promise.resolve(undefined);
	}

	const promise	= mutex.promise.then(async lastReason => {
		mutex.isOwned	= true;
		return f({reason: lastReason, stillOwner: new BehaviorSubject(true)});
	});

	mutex.promise	= promise.catch(() => {}).then(() => {
		mutex.isOwned	= false;
		return reason;
	});

	return promise;
};

/** Creates and returns a lock function that uses util/lock. */
export const lockFunction	= () : LockFunction => {
	const mutex	= {};
	return async <T> (
		f: (o: {reason?: string; stillOwner: BehaviorSubject<boolean>}) => Promise<T>,
		reason?: string
	) =>
		lock(mutex, f, reason)
	;
};

/**
 * Executes a Promise within a mutual-exclusion lock, but
 * will give up after first failed attempt to obtain lock.
 * @returns Whether or not the lock was obtained.
 */
export const lockTryOnce	= async (
	mutex: {isOwned?: boolean; promise?: Promise<string|undefined>},
	f: () => Promise<void>
) : Promise<boolean> => {
	if (!mutex.isOwned) {
		await lock(mutex, f);
		return true;
	}
	return false;
};
